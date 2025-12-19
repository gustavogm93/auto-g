import { NextResponse } from 'next/server'
import { syncIssuesFromGitHub } from '@/lib/sync-issues'

export async function POST() {
  try {
    const result = await syncIssuesFromGitHub()
    
    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      ...result,
    })
  } catch (error) {
    console.error('Error syncing issues:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync issues' 
      },
      { status: 500 }
    )
  }
}
