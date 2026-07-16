const LOOPBACK = /^(?:localhost|127\.0\.0\.1)(?::([0-9]+))?$/i;
const FORM_TYPE = /^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i;

function allowedHost(host) {
  const match = LOOPBACK.exec(host ?? "");
  const port = match?.[1] ? Number(match[1]) : null;
  return Boolean(match) && (port === null || (port >= 1 && port <= 65535));
}

function allowedOrigin(request, host) {
  const origin = request.headers.get("origin");
  try {
    const parsed = new URL(origin);
    return (
      parsed.origin === origin &&
      parsed.protocol === request.nextUrl.protocol &&
      parsed.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}

export async function readLocalForm(request, shapes, { maximumBytes = 65_536 } = {}) {
  const host = request.headers.get("host");
  if (
    !allowedHost(host) ||
    !allowedOrigin(request, host) ||
    request.headers.has("transfer-encoding")
  ) {
    throw new TypeError("forbidden local request");
  }

  const length = request.headers.get("content-length");
  if (length === null || !/^\d+$/.test(length) || Number(length) > maximumBytes) {
    throw new TypeError("invalid form length");
  }
  if (Number(length) === 0 && Array.isArray(shapes) && shapes.length === 0) return {};
  if (!FORM_TYPE.test(request.headers.get("content-type") ?? "")) {
    throw new TypeError("invalid form type");
  }

  const body = await request.text();
  if (Buffer.byteLength(body) !== Number(length) || Buffer.byteLength(body) > maximumBytes) {
    throw new TypeError("invalid form body");
  }
  const params = new URLSearchParams(body);
  const result = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(result, key)) throw new TypeError("duplicate form field");
    result[key] = value;
  }
  const expected = Array.isArray(shapes) ? shapes : shapes[result.action];
  if (
    !expected ||
    Object.keys(result).length !== expected.length ||
    !expected.every((field) => Object.hasOwn(result, field))
  ) {
    throw new TypeError("invalid form fields");
  }
  return result;
}
