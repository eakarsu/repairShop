import { NextResponse } from 'next/server'
export async function POST(request: Request) {
  void request
  return NextResponse.json(
    { success: false, error: 'Public staff registration is disabled; ask an administrator to create an account' },
    { status: 403 }
  )
}
