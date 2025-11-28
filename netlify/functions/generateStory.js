exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { latitude, longitude, previousWords, storyContext, getWordsOnly } = JSON.parse(event.body);

    // Get API keys from environment variables
    const w3wKey = process.env.WHAT3WORDS_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // 1. Get What3Words address
    const w3wResponse = await fetch(
      `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&key=${w3wKey}`
    );
    const w3wData = await w3wResponse.json();
    
    if (w3wData.error) {
      throw new Error(`What3Words API error: ${w3wData.error.message}`);
    }

    const words = w3wData.words; // e.g., "filled.count.soap"
    const wordArray = words.split('.');
    
    // If only getting words (no AI generation), return early
    if (getWordsOnly) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          words: wordArray,
          fullWords: words
        })
      };
    }

    // 2. Generate story with AI (reduced token count)
    // Only send minimal context (last segment) to reduce token usage
    const prompt = previousWords && storyContext
      ? `Continue this story. The story so far: "${storyContext}" New location: ${wordArray.join(', ')}. Write 1-2 sentences continuing the story, naturally incorporating these words: ${wordArray.join(', ')}.`
      : `Write the beginning of a story (1-2 sentences) that incorporates these three words naturally: ${wordArray.join(', ')}.`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100, // Reduced from 200 to 100 for shorter responses
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const aiData = await aiResponse.json();
    
    if (aiData.error) {
      throw new Error(`Anthropic API error: ${aiData.error.message}`);
    }

    const storySegment = aiData.content[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        words: wordArray,
        storySegment: storySegment,
        fullWords: words
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};