const assert = require("node:assert/strict");
const test = require("node:test");
const { roles, userSchema } = require("../src/lib/userValidation");

const validUser = {
  displayName: "Personal notarial",
  email: "personal@notaria.pe",
  password: "clave-segura-2026",
  role: "OPERATOR",
};

test("user creation accepts each supported role", () => {
  for (const role of roles) {
    assert.equal(userSchema.safeParse({ ...validUser, role }).success, true);
  }
});

test("user creation rejects invalid roles and short passwords", () => {
  assert.equal(userSchema.safeParse({ ...validUser, role: "SUPERUSER" }).success, false);
  assert.equal(userSchema.safeParse({ ...validUser, password: "corta" }).success, false);
});

test("user creation normalizes surrounding whitespace", () => {
  const result = userSchema.parse({
    ...validUser,
    displayName: "  Personal notarial  ",
    email: "  personal@notaria.pe  ",
  });

  assert.equal(result.displayName, "Personal notarial");
  assert.equal(result.email, "personal@notaria.pe");
});
