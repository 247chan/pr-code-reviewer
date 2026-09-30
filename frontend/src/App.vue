<script setup>
import { ref } from 'vue'
import sampleFeedback from './mock/sample.json';

// this is the flag defined whether to use real or sample data
// done due to rate limit of gemini ai
const USE_SAMPLE = true;

const repoInput = ref('')
const prNumber = ref('')
const feedback = ref(null)
const loading = ref(false)
const error = ref(null);

const categoryList = {
  bugs: { label: 'bugs', symbol: '!'},
  styleViolations: { label: 'style', symbol: '~'},
  securityIssues: { label: 'security', symbol: 'x'},
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
      <h1>pr-review</h1>
      <p class="tagline">Paste a repo and a PR number. Get back what a reviewer would flag.</p>
    </header>

    <div class="cmd-line">
      <span class="cmd-prompt">repo</span>
      <input v-model="repoInput" placeholder="owner/repo" class="cmd-prompt" type="text">
      <span class="cmd-promt">pr</span>
      <input v-model="prNumber" placeholder="1199" class="cmd-input" type="text">
      <button @click="submitReview" class="run-btn" :disabled="loading">
        {{ loading ? 'running' : 'review' }}
      </button>
    </div>




  </div>




  
  <div class="container">
    <h1>PR Code Reviewer</h1>
    <input v-model="repoInput" placeholder="owner/repo" class="input" />
    <input v-model="prNumber" placeholder="PR number" class="input" />
    <button @click="submitReview" class="button">
      {{ loading ? 'Reviewing...' : 'Review PR' }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="feedback">
      <div  v-for="(items, category) in feedback" :key="category" class="category">
        <h2>{{ category }}</h2>
        <p v-if="items.length === 0">No issues found</p>
        <ul v-else>
          <li v-for="(item, i) in items" :key="i" :class="'severity-' + item.severity">
            <strong>{{ item.file }}:{{ item.line }}</strong> - {{item.description}}
            <span class="badge">{{item.severity}}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>