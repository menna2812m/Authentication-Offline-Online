export function maskUserData(user) {
  return {
    ...user,
    email: user.email ? maskEmail(user.email) : undefined,
    password: "***HIDDEN***",
    phone: user.phone ? maskPhone(user.phone) : undefined,
    ssn: user.ssn ? "***-**-" + user.ssn.slice(-4) : undefined,
    creditCard: user.creditCard
      ? "**** **** **** " + user.creditCard.slice(-4)
      : undefined,

    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,

    maskedAt: new Date().toISOString(),
  };
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  const maskedLocal =
    local.substring(0, 2) + "***" + local.substring(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{3}(\d{4})/, "$1-***-$2");
}
