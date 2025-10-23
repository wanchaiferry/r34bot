const form = document.getElementById('search-form');
const tagsField = document.getElementById('tags');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const postTemplate = document.getElementById('post-template');
const testSamusButton = document.getElementById('test-samus');

let autoScrollTimer;

const SCROLL_INTERVAL_MS = 5000;
const RULE34_API_URL = 'https://api.rule34.xxx/index.php';
const CORS_PROXY_URLS = ['https://cors.isomorphic-git.org/'];

class Rule34ApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'Rule34ApiError';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const tags = tagsField.value.trim();

  if (!tags) {
    statusEl.textContent = 'Please provide at least one tag.';
    return;
  }

  stopAutoScroll();
  clearResults();
  updateStatus(`Loading posts for tags: ${tags}`);

  try {
    const posts = await fetchPosts(tags);

    if (!posts.length) {
      updateStatus('No posts found for the selected tags.');
      return;
    }

    renderPosts(posts);
    updateStatus(`Loaded ${posts.length} posts. Auto-scrolling every 5 seconds.`);
    startAutoScroll();
  } catch (error) {
    console.error(error);

    if (error instanceof Rule34ApiError || error?.name === 'Rule34ApiError') {
      updateStatus(error.message);
      return;
    }

    updateStatus(
      'Unable to load posts after trying multiple endpoints. The Rule34 API may be unavailable or blocking requests from your network. Try again later.'
    );
  }
});

if (testSamusButton) {
  testSamusButton.addEventListener('click', () => {
    tagsField.value = 'samus';
    tagsField.focus();

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });
}

function updateStatus(message) {
  statusEl.textContent = message;
}

function clearResults() {
  resultsEl.innerHTML = '';
}

async function fetchPosts(tags) {
  const params = new URLSearchParams({
    page: 'dapi',
    s: 'post',
    q: 'index',
    json: '1',
    limit: '60',
    tags,
  });

  const urls = buildRule34Endpoints(params);
  let lastError;

  for (const url of urls) {
    try {
      const posts = await requestPostsFromEndpoint(url);
      return posts;
    } catch (error) {
      console.warn('Failed to fetch posts from Rule34 endpoint:', url, error);

      if (error instanceof Rule34ApiError || error?.name === 'Rule34ApiError') {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to fetch posts from Rule34.');
}

function buildRule34Endpoints(params) {
  const query = params.toString();
  const directEndpoint = `${RULE34_API_URL}?${query}`;

  const proxiedEndpoints = CORS_PROXY_URLS.map((proxyBase) => {
    const normalizedProxy = proxyBase.endsWith('/') ? proxyBase : `${proxyBase}/`;
    return `${normalizedProxy}${RULE34_API_URL}?${query}`;
  });

  return [directEndpoint, ...proxiedEndpoints];
}

async function requestPostsFromEndpoint(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Rule34 API request failed with status ${response.status}`);
  }

  const rawBody = await response.text();

  if (!rawBody) {
    return [];
  }

  let data;

  try {
    data = JSON.parse(rawBody);
  } catch (parseError) {
    console.error('Unable to parse Rule34 response as JSON:', parseError);
    throw new Error('Rule34 API returned malformed data.');
  }

  const apiErrorMessage = detectRule34ApiError(data);

  if (apiErrorMessage) {
    throw new Rule34ApiError(apiErrorMessage);
  }

  return normalizePosts(data);
}

function detectRule34ApiError(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const successValue = data.success;

  if (successValue === undefined || successValue === null) {
    return null;
  }

  const normalizedSuccess = String(successValue).trim().toLowerCase();

  if (normalizedSuccess === 'false' || normalizedSuccess === '0') {
    const messageCandidates = [data.message, data.reason, data.error]
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);

    const messageSuffix = messageCandidates.length
      ? `: ${messageCandidates[0]}`
      : '';

    return `The Rule34 API reported an error${messageSuffix}. Please try again later.`;
  }

  return null;
}

function normalizePosts(data) {
  const candidatePosts = extractPostsCollection(data);

  return candidatePosts
    .map((post) => {
      if (!post || typeof post !== 'object') {
        return null;
      }

      const normalized = mergeAttributePayload(post);
      const fileUrl =
        normalized.file_url || normalized.sample_url || normalized.preview_url;

      if (!fileUrl) {
        return null;
      }

      const previewUrl =
        normalized.preview_url || normalized.sample_url || fileUrl;
      const score = parseScore(normalized.score);

      return {
        ...normalized,
        file_url: fileUrl,
        preview_url: previewUrl,
        score,
      };
    })
    .filter(Boolean);
}

function extractPostsCollection(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  if (Array.isArray(data.posts)) {
    return data.posts;
  }

  if (Array.isArray(data.post)) {
    return data.post;
  }

  if (data.posts) {
    return [data.posts];
  }

  if (data.post) {
    return [data.post];
  }

  return [];
}

function mergeAttributePayload(post) {
  const { ['@attributes']: attributes, ...rest } = post;

  if (attributes && typeof attributes === 'object') {
    return { ...rest, ...attributes };
  }

  return rest;
}

function parseScore(rawScore) {
  if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
    return rawScore;
  }

  const parsed = Number.parseInt(rawScore ?? '0', 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function renderPosts(posts) {
  const fragment = document.createDocumentFragment();

  posts.forEach((post) => {
    if (!post?.file_url) {
      return;
    }

    const node = postTemplate.content.cloneNode(true);
    const link = node.querySelector('.post__image-link');
    const img = node.querySelector('.post__image');
    const id = node.querySelector('.post__id');
    const score = node.querySelector('.post__score');

    const postId = post.id ?? post.post_id ?? 'N/A';

    link.href = post.file_url;
    img.src = post.preview_url || post.file_url;
    img.alt = `Rule34 post #${postId}`;
    id.innerHTML = `<strong>ID:</strong> ${postId}`;
    score.innerHTML = `<strong>Score:</strong> ${post.score ?? 0}`;

    fragment.appendChild(node);
  });

  resultsEl.appendChild(fragment);
  resultsEl.scrollTo({ top: 0 });
}

function startAutoScroll() {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
  }

  autoScrollTimer = setInterval(() => {
    const maxScrollTop = resultsEl.scrollHeight - resultsEl.clientHeight;

    if (maxScrollTop <= 0) {
      return;
    }

    if (resultsEl.scrollTop >= maxScrollTop - 5) {
      resultsEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const nextPosition = Math.min(
        resultsEl.scrollTop + resultsEl.clientHeight * 0.9,
        maxScrollTop
      );
      resultsEl.scrollTo({ top: nextPosition, behavior: 'smooth' });
    }
  }, SCROLL_INTERVAL_MS);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
    autoScrollTimer = undefined;
  }
}
