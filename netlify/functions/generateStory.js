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
    const { latitude, longitude, previousWords, storyContext } = JSON.parse(event.body);

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

    // 2. Generate story with AI
    const prompt = previousWords 
      ? `Continue this story. Previous location words were: ${previousWords}. New location words are: ${wordArray.join(', ')}. Previous story: ${storyContext}\n\nWrite 2-3 sentences continuing the story, naturally incorporating the new words: ${wordArray.join(', ')}.`
      : `Write the beginning of a story (2-3 sentences) that incorporates these three words naturally: ${wordArray.join(', ')}.`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
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