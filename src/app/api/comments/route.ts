// Import necessary types and dependencies
import { NextRequest, NextResponse } from 'next/server'

import { Prisma } from '@/app/generated/prisma'
import prisma from '@/lib/db/prisma'
import { ApiError, handleApiError } from '@/lib/error/api-error'

const DEFAULT_PAGE_LIMIT = 10
const MAX_PAGE_LIMIT = 100

// Create new comment
export async function POST(request: NextRequest) {
  try {
    // Get author address from header
    const authorAddress = request.headers.get('x-user-address')
    if (!authorAddress) {
      throw ApiError.unauthorized('User identifier missing')
    }

    // Parse request body
    let body: { content?: string; programId?: string }
    try {
      body = await request.json()
    } catch (parseError) {
      throw ApiError.badRequest('Failed to parse JSON request body')
    }
    const { content, programId } = body

    // Validate input
    const trimmedContent = content?.trim()
    const trimmedProgramId = programId?.trim()

    if (!trimmedContent) {
      throw ApiError.badRequest('Comment content cannot be empty')
    }
    if (!trimmedProgramId) {
      throw ApiError.badRequest('Program ID is required')
    }

    // Create comment in database
    const newComment = await prisma.comment.create({
      data: {
        content: trimmedContent,
        programId: trimmedProgramId,
        authorAddress: authorAddress
      },
      include: {
        author: {
          select: { address: true }
        }
      }
    })

    console.log(
      `[API Comments POST] Comment created for program ${trimmedProgramId}`
    )

    return NextResponse.json(
      { message: 'Comment created successfully.', data: newComment },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API Comments POST] Error:', error)
    return handleApiError(error)
  }
}

// Fetch comments with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Validate and get pagination parameters
    const rawPage = searchParams.get('page') || '1'
    const rawLimit = searchParams.get('limit') || String(DEFAULT_PAGE_LIMIT)

    const page = Number.parseInt(rawPage, 10)
    let limit = Number.parseInt(rawLimit, 10)

    if (Number.isNaN(page) || page < 1) {
      throw ApiError.badRequest(
        'Invalid page number. Must be a positive integer.'
      )
    }
    if (Number.isNaN(limit) || limit < 1) {
      throw ApiError.badRequest('Invalid limit. Must be a positive integer.')
    }
    limit = Math.min(limit, MAX_PAGE_LIMIT)

    const offset = (page - 1) * limit

    // Get filter parameter (programId)
    const programId = searchParams.get('programId')?.trim()
    const whereClause: Prisma.CommentWhereInput = {}

    if (programId) {
      if (programId.length === 0) {
        throw ApiError.badRequest('Invalid programId provided.')
      }
      whereClause.programId = programId
    }

    // Fetch data and get total count
    const [comments, totalComments] = await Promise.all([
      prisma.comment.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { address: true }
          }
        }
      }),
      prisma.comment.count({ where: whereClause })
    ])

    console.log(
      `[API Comments GET] Fetched ${comments.length} comments. Filter: ${JSON.stringify(whereClause)}, Page: ${page}, Limit: ${limit}`
    )

    // Calculate total pages
    const totalPages = Math.ceil(totalComments / limit)

    return NextResponse.json({
      message: 'Comments fetched successfully.',
      data: comments,
      pagination: {
        page,
        limit,
        totalItems: totalComments,
        totalPages
      }
    })
  } catch (error) {
    console.error('[API Comments GET] Error:', error)
    return handleApiError(error)
  }
}
