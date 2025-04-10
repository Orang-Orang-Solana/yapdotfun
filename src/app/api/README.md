# 🚀 API Documentation

## 🛡️ Error Response Format

All API endpoints use consistent error responses with the following format:

```typescript
// Error Response Format
{
  message: string // Description of the error
  code: string // Error code identifier
}
```

**Common Error Codes**:

- `400 BAD_REQUEST`: Client-side validation errors
- `401 UNAUTHORIZED`: Authentication errors
- `403 FORBIDDEN`: Permission errors
- `404 NOT_FOUND`: Resource not found
- `500 SERVER_ERROR`: Internal server errors
- `500 PRISMA_ERROR`: Database-related errors

## 🌟 Authentication API

### GET /api/auth/nonce

**Description**: Get a nonce for Solana signature challenge

**Parameters**:

- `address` (required): Solana wallet address as query parameter

**Response**:

```typescript
{
  message: string
  data: {
    nonce: string // UUID
  }
}
```

**Error Response Example**:

```typescript
// Example error response
{
  message: "Invalid Solana address format",
  code: "BAD_REQUEST"
}
```

**Possible Errors**:

- `400 BAD_REQUEST`: Invalid Solana address format
- `400 BAD_REQUEST`: Address parameter missing

### POST /api/auth/login

**Description**: Login with Solana signature verification

**Request Headers**:

- `x-user-address`: Solana wallet address

**Request Body**:

```typescript
{
  signature: string // Signature of the nonce
}
```

**Response**:

```typescript
{
  success: boolean
  message: string
}
```

**Error Response Example**:

```typescript
// Example error response
{
  message: "Invalid or malformed signature format received",
  code: "BAD_REQUEST"
}
```

**Possible Errors**:

- `400 BAD_REQUEST`: Invalid or malformed signature format
- `400 BAD_REQUEST`: Expired or invalid login challenge
- `401 UNAUTHORIZED`: Invalid signature
- `401 UNAUTHORIZED`: User identifier missing

## 📝 Comments API

### GET /api/comments

**Description**: Fetch comments with pagination

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 10, max: 100)
- `programId` (optional): Filter by program ID

**Response**:

```typescript
{
  message: string;
  data: Comment[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  }
}
```

**Error Response Example**:

```typescript
// Example error response
{
  message: "Invalid page number. Must be a positive integer.",
  code: "BAD_REQUEST"
}
```

**Possible Errors**:

- `400 BAD_REQUEST`: Invalid page number
- `400 BAD_REQUEST`: Invalid limit
- `400 BAD_REQUEST`: Invalid programId
- `404 NOT_FOUND`: Record not found
- `400 BAD_REQUEST`: Foreign key violation
- `400 BAD_REQUEST`: Unique constraint violation

### POST /api/comments

**Description**: Create a new comment

**Request Headers**:

- `x-user-address`: Solana wallet address

**Request Body**:

```typescript
{
  content: string
  programId: string
}
```

**Response**:

```typescript
{
  message: string
  data: Comment
}
```

**Error Response Example**:

```typescript
// Example error response
{
  message: "User identifier missing",
  code: "UNAUTHORIZED"
}
```

**Possible Errors**:

- `401 UNAUTHORIZED`: User identifier missing
- `400 BAD_REQUEST`: Failed to parse JSON request body
- `400 BAD_REQUEST`: Comment content cannot be empty
- `400 BAD_REQUEST`: Program ID is required
- `404 NOT_FOUND`: Record not found
- `400 BAD_REQUEST`: Foreign key violation
- `400 BAD_REQUEST`: Unique constraint violation

## 🎯 Other Endpoints

### GET /api/hello

**Description**: Test endpoint

**Response**:

```typescript
{
  message: string
}
```

**Error Response Example**:

```typescript
// Example error response
{
  message: "Internal server error",
  code: "SERVER_ERROR"
}
```

**Possible Errors**:

- `500 SERVER_ERROR`: Internal server errors

## 🔄 Authentication Flow

1. Client requests a nonce using `/api/auth/nonce` with their Solana address
2. Client signs the nonce with their Solana wallet
3. Client sends the signature to `/api/auth/login` with their address in header
4. Server verifies the signature and returns a JWT token in HTTP-only cookie named `yap-auth-token`
5. Subsequent requests automatically include the authentication token via the `yap-auth-token` cookie

## 📌 Notes

- All endpoints are rate-limited
- Authentication tokens expire after 7 days
- All responses are in JSON format
- Error messages are descriptive and include error codes
- Use `x-user-address` header for authenticated requests
- Authentication token is stored in HTTP-only cookie named `yap-auth-token`
