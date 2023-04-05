import {
  Enumeration,
  OpenAPIRoute,
  Query,
  Str
} from '@cloudflare/itty-router-openapi'

import * as types from './types'

export class DexaSearch extends OpenAPIRoute {
  static schema = {
    tags: ['dexa'],
    summary:
      'Searches the Lex Fridman podcast transcripts for any topic or question and returns the most relevant results in the form of chunks of conversations. Multiple chunks can be combined to form a summary of the topic or question.',
    parameters: {
      query: Query(
        new Str({
          description:
            'Search query either in the form of a question of keywords',
          example: 'What is the meaning of life?'
        }),
        {
          required: true
        }
      )
    },
    responses: {
      '200': {
        schema: {
          results: [
            {
              content: new Str({
                description: 'The content of the transcription chunk'
              }),
              // chunkSummary: new Str({
              //   description: 'GPT generated summary of the chunk content'
              // }),
              docName: new Str({
                description: 'Name of the document (episode) the chunk is from'
              }),
              sectionName: new Str({
                description:
                  'Name of the section (chapter) the chunk is from within the source episode'
              }),
              chunkName: new Str({
                description: 'Name of the chunk'
              }),
              peopleNames: [
                new Str({
                  description:
                    'Name of the person (or people) who spoke in this chunk'
                })
              ],
              url: new Str({
                description: 'URL to the search result',
                example:
                  'https://dexa.ai/lex/episodes/doc_358?sectionSid=sec_5319&chunkSid=chunk_9725'
              })
            }
          ]
        }
      }
    }
  }

  async handle(request: Request, env: any, _ctx, data: Record<string, any>) {
    // const url = new URL(request.url)
    // const input = url.searchParams.get('input') || 'hello'
    // const font: any = url.searchParams.get('font') || 'Ghost'
    console.log({ env, data })
    console.log(env.DEXA_API_BASE_URL, data.query)
    const dexaApiBaseUrl = env.DEXA_API_BASE_URL
    if (!dexaApiBaseUrl) {
      return new Response('DEXA_API_BASE_URL not set', { status: 500 })
    }

    const url = `${dexaApiBaseUrl}/api/query`
    const body = types.DexaSearchRequestBodySchema.parse({
      query: data.query,
      topK: 40
    })
    const dexaRes: types.DexaSearchResponseBody = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json'
      }
    }).then((res) => {
      if (!res.ok) {
        throw new Error(`Dexa API error: ${res.statusText}`)
      }

      return res.json()
    })

    console.log(dexaRes)
    const results = dexaRes.chunks.map((chunk) => ({
      content: chunk.content,
      // chunkSummary: chunk.chunkSummary,
      peopleNames: chunk.peopleNames,
      chunkName: chunk.chunkName,
      sectionName: chunk.sectionName,
      docName: chunk.docName,
      url: `https://dexa.ai/lex/episodes/${chunk.docSid}?sectionSid=${chunk.sectionSid}&chunkSid=${chunk.chunkSid}`
    }))

    const responseBody = {
      results
    }

    return new Response(JSON.stringify(responseBody, null, 2), {
      headers: {
        'content-type': 'application/json;charset=UTF-8'
      }
    })
  }
}