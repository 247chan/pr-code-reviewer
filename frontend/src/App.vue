<script setup>
import { ref } from 'vue'
import sampleFeedback from './mock/sample.json';

// this is the flag defined whether to use real or sample data
// added this due to rate limit of gemini ai (and for visualizing ui)
const USE_SAMPLE = true;

const repoInput = ref('')
const prNumber = ref('')
const feedback = ref(null)
const loading = ref(false)
const error = ref(null);

const categoryList = {
  bugs: { label: 'bugs', symbol: '!'},
  styleViolations: { label: 'style', symbol: '~'},
  securityIssues: { label: 'security', symbol: '*'},
  optimizations: { label: 'optimizations', symbol: '+'}
}

async function submitReview() {
  loading.value = true
  error.value = null
  feedback.value = null

  if(USE_SAMPLE){
    setTimeout(() => {
      feedback.value = sampleFeedback;
      loading.value = false;
    }, 500);
    return;
  }

  try{
    const [owner, repo] = repoInput.value.split('/');
    const res = await fetch('http://localhost:5000/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({owner, repo, pullNumber: prNumber.value})
    })
    const data = await res.json()
    if(data.error){
      throw new Error(data.error)
    }
    feedback.value = data.feedback;
  } catch (err){
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function totalIssues(items){
  return items?.length ? items?.length : 0;
}
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>pr-reviewer</h1>
      <p class="tagline">Paste a repo and a PR number. Get back what a reviewer would flag!</p>
    </header>

    <div class="cmd-line">
      <span class="cmd-prompt">repo</span>
      <input v-model="repoInput" placeholder="owner/repo" class="cmd-prompt" id="repo-input" type="text">
      <span class="cmd-prompt">pr no.</span>
      <input v-model="prNumber" placeholder="1199" class="cmd-input" type="text">
      <button @click="submitReview" class="run-btn" :disabled="loading">
        {{ loading ? 'running' : 'review' }}
      </button>
    </div>

    <p v-if="error" class="error-line">error: {{ error }}</p>

    <div v-if="feedback" class="log">
      <section
        v-for="(items, category) in feedback"
        :key="category"
        class="log-section"
      >
        <div class="log-section-div">
          <span class="log-seciton-symbol">{{ categoryList[category]?.symbol ?? '.'}}</span>
          <span class="log-section-label">{{ categoryList[category]?.label ?? category }}</span>
          <span class="log-section-count">{{ totalIssues(items) }}</span>
        </div>

        <p v-if="items.length === 0" class="log-empty">clean - nothing flagged</p>

        <ul v-else class="log-items">
          <li
            v-for="(item, i) in items"
            :key="i"
            class="log-item"
            :class="`log-item-${item.severity}`">
            <span class="log-item-loc">{{ item.file }}:{{ item.line }}</span>
            <span class="log-item-desc">{{ item.description }}</span>
            <span class="log-item-sev" :class="`sev-lvl-${item.severity}`">{{ item.severity }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>