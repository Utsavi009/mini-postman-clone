# Mini Postman Clone

A small API client built with React + TypeScript and an Express/Node.js proxy.

## Features
- GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS
- Query parameters and custom request headers
- None, Bearer token, Basic Auth and API-key authentication
- Raw JSON request body
- Response status, body, headers, duration and size
- Last 50 requests stored in browser localStorage

## Run locally
Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API server runs on http://localhost:4000.

## Production build
```bash
npm run build
npm run start
```

The client build is in `client/dist`; serve it with your preferred static host or add static serving to Express.

## Security notes before deployment
This starter's server is an outbound HTTP proxy. Do not expose it publicly as-is: that creates an SSRF/open-proxy risk. Add authentication, strict destination allowlists, private/link-local IP blocking (including DNS-rebinding defenses), rate limits, request/response size limits, audit logging, and deployment-specific CORS rules. Never persist real credentials in localStorage; use a secure backend secret store for shared/team environments.
