
const jwt = require('jsonwebtoken');

const secret = 'OEWz++7tSBVBdRVIB1K7Eg8jOpgXfSTAzdrXlLfPLFs4dp07ipkZ8BdxaAXMnAt1t/PN2kWTSpc56rb5EWOpfA==';

const anonPayload = {
    "role": "anon",
    "iss": "supabase",
    "iat": Math.floor(Date.now() / 1000),
    "exp": Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10) // 10 anos
};

const servicePayload = {
    "role": "service_role",
    "iss": "supabase",
    "iat": Math.floor(Date.now() / 1000),
    "exp": Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10) // 10 anos
};

const anonKey = jwt.sign(anonPayload, secret);
const serviceKey = jwt.sign(servicePayload, secret);

console.log("ANON_KEY=" + anonKey);
console.log("SERVICE_KEY=" + serviceKey);
