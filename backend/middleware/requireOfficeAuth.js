const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Same Entra ID / Teams SSO validation pattern as Bedrock.
// Requires TENANT_ID and CLIENT_ID (the app registration's Application ID) in .env.
const TENANT_ID = process.env.ENTRA_TENANT_ID;
const CLIENT_ID = process.env.ENTRA_CLIENT_ID;
// Tokens issued for this app's own exposed API scope (api://<client-id>/access_as_user)
// carry that full URI as the audience — not the bare client ID GUID — confirmed
// directly from a decoded live token, despite general docs suggesting otherwise.
const EXPECTED_AUDIENCE = `api://${CLIENT_ID}`;

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

/**
 * Verifies the Bearer token issued by Entra ID for a signed-in office/PM user.
 * On success, attaches req.user = { email, name, oid }.
 *
 * TODO: once EXECUTIVE_EMAILS-style scoping matters here (e.g. only certain
 * office users can delete jobs), layer a requireRole style check on top,
 * same pattern as Bedrock's permissions.js.
 */
function requireOfficeAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: EXPECTED_AUDIENCE,
      issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      algorithms: ['RS256']
    },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.user = {
        email: decoded.preferred_username || decoded.email,
        name: decoded.name,
        oid: decoded.oid
      };
      next();
    }
  );
}

module.exports = requireOfficeAuth;
