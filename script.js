const form = document.getElementById('search-form');
const tagsField = document.getElementById('tags');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const postTemplate = document.getElementById('post-template');

let autoScrollTimer;

const SCROLL_INTERVAL_MS = 5000;

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
    updateStatus(
      'Unable to load posts. The Rule34 API may be unavailable or blocked by CORS. Try again later.'
    );
  }
});

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

  const endpoint = `https://api.rule34.xxx/index.php?${params.toString()}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Rule34 API request failed: ${response.status}`);
  }

  return response.json();
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

    link.href = post.file_url;
    img.src = post.preview_url || post.file_url;
    img.alt = `Rule34 post #${post.id ?? 'unknown'}`;
    id.innerHTML = `<strong>ID:</strong> ${post.id ?? 'N/A'}`;
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
