import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://backend:3001'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyRequest(request, proxy, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyRequest(request, proxy, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyRequest(request, proxy, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyRequest(request, proxy, 'DELETE')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyRequest(request, proxy, 'PATCH')
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ proxy: string[] }> }
) {
  const { proxy } = await params
  return proxyRequest(request, proxy, 'OPTIONS')
}

async function proxyRequest(
  request: NextRequest,
  proxy: string[],
  method: string
) {
  try {
    const path = proxy.join('/')
    const url = `${BACKEND_URL}/api/${path}`
    
    // Get search params
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    const fullUrl = queryString ? `${url}?${queryString}` : url

    // Get request headers
    const headers = new Headers()
    request.headers.forEach((value, key) => {
      // Skip host header to avoid conflicts
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value)
      }
    })

    // Get request body for methods that support it
    let body = undefined
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      body = await request.text()
    }

    // Make request to backend
    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
    })

    // Get response body
    const responseBody = await response.text()
    
    // Create response with same status and headers
    const proxyResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    })

    // Copy response headers
    response.headers.forEach((value, key) => {
      proxyResponse.headers.set(key, value)
    })

    return proxyResponse
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Backend connection failed' },
      { status: 500 }
    )
  }
}