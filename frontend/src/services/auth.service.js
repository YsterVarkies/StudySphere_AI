const API_URL = 'http://localhost:5000/api'

async function postAuth(path, data) {
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  } catch {
    throw new Error('Unable to connect to the server. Please check your connection and try again.')
  }

  const responseBody = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(responseBody.message || 'The authentication request failed. Please try again.')
    error.status = response.status
    error.field = responseBody.field
    error.details = responseBody
    throw error
  }

  return responseBody
}

export function registerUser(data) {
  return postAuth('/auth/register', data)
}

export function loginUser(data) {
  return postAuth('/auth/login', data)
}
