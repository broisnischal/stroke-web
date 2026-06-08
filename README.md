# Stroke Web

This is the web application for Stroke.

## Development

### Prerequisites

- Node.js 18.x
- Yarn
- Bun
- Cloudflare CLI
- Cloudflare D1
- Cloudflare Workers

POST /api/admin/license/revoke — revoke a license (by license_key or user_id)
POST /api/admin/license/unrevoke — restore a revoked license
GET /api/admin/license/info — view license details + all active devices
DELETE /api/admin/license/info — clear all device seats for a license
