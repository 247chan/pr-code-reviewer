<script setup>
import { ref } from 'vue'

const repoInput = ref('')
const prNumber = ref('')
const feedback = ref(null)
const loading = ref(false)
const error = ref(null);

async function submitReview() {
  loading.value = true
  error.value = null
  feedback.value = null
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
</script>

<template>
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