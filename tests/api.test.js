import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { rm } from "node:fs/promises";

const explicitUri = process.env.MONGODB_URI;
if (explicitUri && !new URL(explicitUri).pathname.endsWith("/saraha_app_test")) {
  throw new Error("Automated tests refuse to run unless MONGODB_URI targets saraha_app_test");
}
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/saraha_app_test";
process.env.PORT = "3001";
process.env.EMAIL_PROVIDER = "memory";
process.env.REQUIRE_EMAIL_VERIFICATION = "true";
process.env.AVATAR_UPLOAD_DIR = "work/test-uploads/avatars";

const { connectDatabase, disconnectDatabase } = await import("../src/database/connect.js");
const { createApp } = await import("../src/app.js");
const { User } = await import("../src/database/models/user.model.js");
const { Message } = await import("../src/database/models/message.model.js");
const { RefreshSession } = await import("../src/database/models/refresh-session.model.js");
const { EmailToken } = await import("../src/database/models/email-token.model.js");
const { Report } = await import("../src/database/models/report.model.js");
const { emailService } = await import("../src/modules/email/email.service.js");
const { createOpaqueToken, createRefreshExpiry, hashOpaqueToken, signAccessToken } =
  await import("../src/common/security/tokens.js");
const argon2 = (await import("argon2")).default;

const api = request(createApp());
const userIds = new Set();
const messageIds = new Set();
const reportIds = new Set();

function unique(prefix) {
  return prefix + "_" + randomUUID().replaceAll("-", "").slice(0, 16);
}

async function createUnverifiedAccount(prefix = "user") {
  const email = unique(prefix) + "@example.test";
  const username = unique(prefix).slice(0, 24);
  const response = await api.post("/api/v1/auth/signup").send({
    name: "Test User",
    username,
    email,
    password: "Strong-Test-Password-2026!"
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  userIds.add(response.body.data.user.id);
  return { ...response.body.data, email, username };
}

function extractEmailToken(email) {
  return email?.text.match(/token is:\n([A-Za-z0-9_-]+)/)?.[1];
}

async function signup(prefix = "user") {
  const created = await createUnverifiedAccount(prefix);
  const verificationEmail = emailService
    .getTestOutbox()
    .slice()
    .reverse()
    .find((item) => item.to === created.email && item.subject.includes("Verify"));
  const verificationToken = extractEmailToken(verificationEmail);
  assert.ok(verificationToken, "Signup must send a verification token");
  const verification = await api.post("/api/v1/auth/verify-email").send({ token: verificationToken });
  assert.equal(verification.status, 200, JSON.stringify(verification.body));

  const login = await api.post("/api/v1/auth/login").send({
    email: created.email,
    password: "Strong-Test-Password-2026!"
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { ...login.body.data, email: created.email, username: created.username };
}

async function seedAdmin() {
  const passwordHash = await argon2.hash("Strong-Test-Admin-Password-2026!", { type: argon2.argon2id });
  const user = await User.create({
    name: "Test Admin",
    username: unique("admin").slice(0, 24),
    email: unique("admin") + "@example.test",
    passwordHash,
    role: "ADMIN"
  });
  userIds.add(String(user._id));

  const refreshToken = createOpaqueToken();
  const session = await RefreshSession.create({
    userId: user._id,
    tokenHash: hashOpaqueToken(refreshToken),
    familyId: randomUUID(),
    jti: randomUUID(),
    expiresAt: createRefreshExpiry()
  });
  return signAccessToken(user._id, user.role, session._id);
}

before(async () => {
  await connectDatabase();
  await Promise.all([User.init(), Message.init(), RefreshSession.init(), EmailToken.init(), Report.init()]);
});

after(async () => {
  const ids = [...userIds];
  const messageObjectIds = [...messageIds];
  if (messageObjectIds.length)
    await Report.deleteMany({ messageId: mongoose.trusted({ $in: messageObjectIds }) });
  if (ids.length) {
    await Promise.all([
      Report.deleteMany({ reporterUserId: mongoose.trusted({ $in: ids }) }),
      Message.deleteMany({ recipient: mongoose.trusted({ $in: ids }) }),
      RefreshSession.deleteMany({ userId: mongoose.trusted({ $in: ids }) }),
      EmailToken.deleteMany({ userId: mongoose.trusted({ $in: ids }) })
    ]);
    await User.deleteMany({ _id: mongoose.trusted({ $in: ids }) });
  }
  await rm("work/test-uploads", { recursive: true, force: true });
  await disconnectDatabase();
});

test("health endpoint returns a stable success response", async () => {
  const response = await api.get("/api/v1/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "ok");
});

test("signup hashes the password, defaults to USER, and stores only a refresh hash", async () => {
  const result = await signup("signup");
  assert.equal(result.user.role, "USER");
  assert.equal(result.tokenType, "Bearer");
  assert.ok(result.accessToken);
  assert.ok(result.refreshToken);
  assert.equal(Object.hasOwn(result.user, "passwordHash"), false);
  assert.equal(Object.hasOwn(result.user, "password"), false);

  const user = await User.findById(result.user.id).select("+passwordHash");
  assert.match(user.passwordHash, /^\$argon2id\$/);
  const session = await RefreshSession.findOne({ userId: user._id }).select("+tokenHash");
  assert.ok(session.tokenHash);
  assert.notEqual(session.tokenHash, result.refreshToken);
  assert.equal(Object.hasOwn(session.toObject(), "refreshToken"), false);
});

test("duplicate accounts and invalid input are rejected", async () => {
  const first = await signup("duplicate");
  const duplicate = await api.post("/api/v1/auth/signup").send({
    name: "Another User",
    username: first.username,
    email: unique("other") + "@example.test",
    password: "Strong-Test-Password-2026!"
  });
  assert.equal(duplicate.status, 409);

  const invalid = await api.post("/api/v1/auth/signup").send({
    name: "",
    username: "not valid",
    email: "not-an-email",
    password: "short"
  });
  assert.equal(invalid.status, 422);
});

test("login and Bearer authentication distinguish authentication from role checks", async () => {
  const registered = await signup("login");
  const wrong = await api.post("/api/v1/auth/login").send({
    email: registered.email,
    password: "Wrong-Password-2026!"
  });
  assert.equal(wrong.status, 401);

  const login = await api.post("/api/v1/auth/login").send({
    email: registered.email,
    password: "Strong-Test-Password-2026!"
  });
  assert.equal(login.status, 200);

  const missing = await api.get("/api/v1/users/me");
  assert.equal(missing.status, 401);
  const me = await api.get("/api/v1/users/me").set("Authorization", "Bearer " + login.body.data.accessToken);
  assert.equal(me.status, 200);
  assert.equal(me.body.data.username, registered.username);
  assert.equal(Object.hasOwn(me.body.data, "passwordHash"), false);

  const forbidden = await api
    .get("/api/v1/admin/users")
    .set("Authorization", "Bearer " + login.body.data.accessToken);
  assert.equal(forbidden.status, 403);

  const attemptedPromotion = await api
    .patch("/api/v1/users/me")
    .set("Authorization", "Bearer " + login.body.data.accessToken)
    .send({ role: "ADMIN" });
  assert.equal(attemptedPromotion.status, 422);
});

test("refresh rotates once, detects token reuse, and revokes the token family", async () => {
  const registered = await signup("refresh");
  const oldRefresh = registered.refreshToken;
  const rotated = await api.post("/api/v1/auth/refresh").send({ refreshToken: oldRefresh });
  assert.equal(rotated.status, 200);
  assert.notEqual(rotated.body.data.refreshToken, oldRefresh);

  const currentAccessWorks = await api
    .get("/api/v1/users/me")
    .set("Authorization", "Bearer " + rotated.body.data.accessToken);
  assert.equal(currentAccessWorks.status, 200);

  const replay = await api.post("/api/v1/auth/refresh").send({ refreshToken: oldRefresh });
  assert.equal(replay.status, 401);
  assert.equal(replay.body.error.code, "REFRESH_REUSE_DETECTED");

  const revokedAccess = await api
    .get("/api/v1/users/me")
    .set("Authorization", "Bearer " + rotated.body.data.accessToken);
  assert.equal(revokedAccess.status, 401);
});

test("logout revokes the active session immediately", async () => {
  const registered = await signup("logout");
  const logout = await api
    .post("/api/v1/auth/logout")
    .set("Authorization", "Bearer " + registered.accessToken);
  assert.equal(logout.status, 200);
  const profile = await api.get("/api/v1/users/me").set("Authorization", "Bearer " + registered.accessToken);
  assert.equal(profile.status, 401);
});

test("anonymous messages are encrypted at rest, have no senderId, and respect ownership", async () => {
  const recipient = await signup("recipient");
  const other = await signup("other");
  const content = "A private test message " + unique("text");

  const sent = await api.post("/api/v1/public/users/" + recipient.username + "/messages").send({ content });
  assert.equal(sent.status, 201);
  const messageId = sent.body.data.id;
  messageIds.add(messageId);

  const stored = await Message.findById(messageId).select("+encryptedContent +iv +authTag");
  assert.ok(stored.encryptedContent);
  assert.notEqual(Buffer.from(stored.encryptedContent, "base64").toString("utf8"), content);
  assert.equal(Buffer.from(stored.iv, "base64").length, 12);
  assert.equal(Buffer.from(stored.authTag, "base64").length, 16);
  assert.equal(Object.hasOwn(stored.toObject(), "senderId"), false);

  const wrongOwner = await api
    .get("/api/v1/messages/" + messageId)
    .set("Authorization", "Bearer " + other.accessToken);
  assert.equal(wrongOwner.status, 404);

  const inbox = await api
    .get("/api/v1/messages/inbox")
    .set("Authorization", "Bearer " + recipient.accessToken);
  assert.equal(inbox.status, 200);
  assert.equal(inbox.body.data.items[0].content, content);

  const read = await api
    .patch("/api/v1/messages/" + messageId + "/read")
    .set("Authorization", "Bearer " + recipient.accessToken);
  assert.equal(read.status, 200);
  assert.equal(read.body.data.isRead, true);

  const deletedByOther = await api
    .delete("/api/v1/messages/" + messageId)
    .set("Authorization", "Bearer " + other.accessToken);
  assert.equal(deletedByOther.status, 404);

  const deletedByOwner = await api
    .delete("/api/v1/messages/" + messageId)
    .set("Authorization", "Bearer " + recipient.accessToken);
  assert.equal(deletedByOwner.status, 200);
  const afterDelete = await api
    .get("/api/v1/messages/" + messageId)
    .set("Authorization", "Bearer " + recipient.accessToken);
  assert.equal(afterDelete.status, 404);
});

test("message settings, reports, and ADMIN moderation are enforced", async () => {
  const recipient = await signup("moderation");
  const adminAccess = await seedAdmin();
  const sent = await api
    .post("/api/v1/public/users/" + recipient.username + "/messages")
    .send({ content: "Reportable test message" });
  assert.equal(sent.status, 201);
  const messageId = sent.body.data.id;
  messageIds.add(messageId);

  const report = await api
    .post("/api/v1/messages/" + messageId + "/report")
    .set("Authorization", "Bearer " + recipient.accessToken)
    .send({ reason: "SPAM", details: "Test fixture" });
  assert.equal(report.status, 201);
  reportIds.add(report.body.data.id);

  const reports = await api.get("/api/v1/admin/reports").set("Authorization", "Bearer " + adminAccess);
  assert.equal(reports.status, 200);
  assert.equal(reports.body.data.items.length >= 1, true);
  const createdReport = reports.body.data.items.find((item) => item.id === report.body.data.id);
  assert.ok(createdReport?.reporter?.username);
  assert.ok(createdReport?.message?.recipient?.username);
  assert.equal(Object.hasOwn(createdReport, "_id"), false);

  const review = await api
    .patch("/api/v1/admin/reports/" + report.body.data.id)
    .set("Authorization", "Bearer " + adminAccess)
    .send({ status: "REVIEWED" });
  assert.equal(review.status, 200);
  assert.equal(review.body.data.status, "REVIEWED");

  const settings = await api
    .patch("/api/v1/users/me/settings")
    .set("Authorization", "Bearer " + recipient.accessToken)
    .send({ acceptMessages: false });
  assert.equal(settings.status, 200);

  const rejected = await api
    .post("/api/v1/public/users/" + recipient.username + "/messages")
    .send({ content: "Should not be accepted" });
  assert.equal(rejected.status, 403);
});

test("unverified users cannot log in before consuming the email verification token", async () => {
  const created = await createUnverifiedAccount("unverified");
  const login = await api.post("/api/v1/auth/login").send({
    email: created.email,
    password: "Strong-Test-Password-2026!"
  });
  assert.equal(login.status, 403);
  assert.equal(login.body.error.code, "EMAIL_NOT_VERIFIED");
});

test("email verification tokens are one-time and stored only as hashes", async () => {
  const created = await createUnverifiedAccount("emailverify");
  const email = emailService
    .getTestOutbox()
    .slice()
    .reverse()
    .find((item) => item.to === created.email && item.subject.includes("Verify"));
  const token = extractEmailToken(email);
  assert.ok(token);

  const storedToken = await EmailToken.findOne({ userId: created.user.id, purpose: "EMAIL_VERIFICATION" })
    .select("+tokenHash")
    .lean();
  assert.ok(storedToken.tokenHash);
  assert.notEqual(storedToken.tokenHash, token);

  const verified = await api.post("/api/v1/auth/verify-email").send({ token });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.data.isVerified, true);

  const replay = await api.post("/api/v1/auth/verify-email").send({ token });
  assert.equal(replay.status, 400);
  const user = await User.findById(created.user.id).lean();
  assert.equal(user.isVerified, true);
});

test("password reset changes the hash and revokes existing sessions", async () => {
  const registered = await signup("passwordreset");
  emailService.clearTestOutbox();

  const requested = await api.post("/api/v1/auth/forgot-password").send({ email: registered.email });
  assert.equal(requested.status, 200);
  const resetEmail = emailService.getTestOutbox().find((item) => item.to === registered.email);
  const token = extractEmailToken(resetEmail);
  assert.ok(token);

  const reset = await api.post("/api/v1/auth/reset-password").send({
    token,
    password: "New-Strong-Password-2026!"
  });
  assert.equal(reset.status, 200);
  assert.equal(reset.body.data.sessionsRevoked, true);

  const oldPasswordLogin = await api.post("/api/v1/auth/login").send({
    email: registered.email,
    password: "Strong-Test-Password-2026!"
  });
  assert.equal(oldPasswordLogin.status, 401);

  const newPasswordLogin = await api.post("/api/v1/auth/login").send({
    email: registered.email,
    password: "New-Strong-Password-2026!"
  });
  assert.equal(newPasswordLogin.status, 200);

  const oldAccess = await api
    .get("/api/v1/users/me")
    .set("Authorization", "Bearer " + registered.accessToken);
  assert.equal(oldAccess.status, 401);
});

test("avatar upload accepts a real PNG signature and stores only a generated filename", async () => {
  const registered = await signup("avatar");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p5sAAAAASUVORK5CYII=",
    "base64"
  );

  const uploaded = await api
    .post("/api/v1/users/me/avatar")
    .set("Authorization", "Bearer " + registered.accessToken)
    .attach("avatar", png, { filename: "profile.png", contentType: "image/png" });

  assert.equal(uploaded.status, 200, JSON.stringify(uploaded.body));
  assert.match(uploaded.body.data.avatarUrl, /^\/uploads\/avatars\/[0-9a-f-]+\.png$/i);
  const imageResponse = await api.get(uploaded.body.data.avatarUrl);
  assert.equal(imageResponse.status, 200);
});

test("Mongoose virtuals, lean objects, and optimistic concurrency behave as expected", async () => {
  const registered = await signup("mongoosefeatures");
  const document = await User.findById(registered.user.id);
  assert.equal(document.publicProfileUrl, "/api/v1/public/users/" + registered.username);

  const plainObject = await User.findById(registered.user.id).lean();
  assert.equal(typeof plainObject.save, "undefined");
  assert.equal(Object.hasOwn(plainObject, "publicProfileUrl"), false);

  const firstRead = await User.findById(registered.user.id);
  const secondRead = await User.findById(registered.user.id);
  firstRead.bio = "First update";
  await firstRead.save();
  secondRead.bio = "Conflicting update";
  await assert.rejects(() => secondRead.save(), mongoose.Error.VersionError);
});

test("admin deactivation revokes sessions and reactivation does not restore old access", async () => {
  const registered = await signup("deactivated");
  const adminAccess = await seedAdmin();

  const deactivated = await api
    .patch("/api/v1/admin/users/" + registered.user.id + "/status")
    .set("Authorization", "Bearer " + adminAccess)
    .send({ isActive: false });
  assert.equal(deactivated.status, 200);

  const session = await RefreshSession.findOne({ userId: registered.user.id }).lean();
  assert.ok(session.revokedAt);

  const reactivated = await api
    .patch("/api/v1/admin/users/" + registered.user.id + "/status")
    .set("Authorization", "Bearer " + adminAccess)
    .send({ isActive: true });
  assert.equal(reactivated.status, 200);

  const oldToken = await api.get("/api/v1/users/me").set("Authorization", "Bearer " + registered.accessToken);
  assert.equal(oldToken.status, 401);
});

test("admin list query schemas reject irrelevant filters", async () => {
  const adminAccess = await seedAdmin();
  const invalidUsersQuery = await api
    .get("/api/v1/admin/users?status=OPEN")
    .set("Authorization", "Bearer " + adminAccess);
  assert.equal(invalidUsersQuery.status, 422);

  const invalidReportsQuery = await api
    .get("/api/v1/admin/reports?search=someone")
    .set("Authorization", "Bearer " + adminAccess);
  assert.equal(invalidReportsQuery.status, 422);
});

test("concurrent signup requests cannot create duplicate normalized email values", async () => {
  const email = unique("race") + "@example.test";
  const payload = (username) => ({
    name: "Race User",
    username,
    email,
    password: "Strong-Test-Password-2026!"
  });
  const [first, second] = await Promise.all([
    api.post("/api/v1/auth/signup").send(payload(unique("racea").slice(0, 24))),
    api.post("/api/v1/auth/signup").send(payload(unique("raceb").slice(0, 24)))
  ]);
  assert.deepEqual([first.status, second.status].sort(), [201, 409]);
  const successful = first.status === 201 ? first : second;
  userIds.add(successful.body.data.user.id);
  const matchingUsers = await User.countDocuments({ email });
  assert.equal(matchingUsers, 1);
});

test("admin user search and pagination use the intended query filters", async () => {
  const registered = await signup("finders");
  const adminAccess = await seedAdmin();
  const response = await api
    .get("/api/v1/admin/users")
    .query({ page: 1, limit: 5, search: registered.username })
    .set("Authorization", "Bearer " + adminAccess);
  assert.equal(response.status, 200);
  const listedUser = response.body.data.items.find((item) => item.username === registered.username);
  assert.ok(listedUser);
  assert.ok(listedUser.id);
  assert.equal(Object.hasOwn(listedUser, "_id"), false);
  assert.equal(response.body.data.pagination.page, 1);
});

test("message endpoints reject malformed ObjectIds", async () => {
  const registered = await signup("badid");
  const response = await api
    .get("/api/v1/messages/not-an-object-id")
    .set("Authorization", "Bearer " + registered.accessToken);
  assert.equal(response.status, 422);
});

test("duplicate reports are rejected by the compound unique index", async () => {
  const recipient = await signup("dupreport");
  const sent = await api
    .post("/api/v1/public/users/" + recipient.username + "/messages")
    .send({ content: "A report test message" });
  assert.equal(sent.status, 201);
  const messageId = sent.body.data.id;
  messageIds.add(messageId);

  const payload = { reason: "SPAM", details: "Repeated report test" };
  const first = await api
    .post("/api/v1/messages/" + messageId + "/report")
    .set("Authorization", "Bearer " + recipient.accessToken)
    .send(payload);
  assert.equal(first.status, 201);

  const duplicate = await api
    .post("/api/v1/messages/" + messageId + "/report")
    .set("Authorization", "Bearer " + recipient.accessToken)
    .send(payload);
  assert.equal(duplicate.status, 409);
});

test("concurrent refresh requests cannot leave an active replacement in a replayed family", async () => {
  const registered = await signup("refreshrace");
  const originalSession = await RefreshSession.findOne({
    tokenHash: hashOpaqueToken(registered.refreshToken)
  }).lean();
  assert.ok(originalSession);

  const [first, second] = await Promise.all([
    api.post("/api/v1/auth/refresh").send({ refreshToken: registered.refreshToken }),
    api.post("/api/v1/auth/refresh").send({ refreshToken: registered.refreshToken })
  ]);

  assert.deepEqual([first.status, second.status].sort(), [200, 401]);
  const family = await RefreshSession.find({ familyId: originalSession.familyId }).lean();
  assert.ok(family.length >= 2);
  assert.ok(family.every((session) => session.revokedAt));
});
