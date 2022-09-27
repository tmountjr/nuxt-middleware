<template>
  <div class="stateful">
    <h1>Previous Value</h1>
    <p>{{ previousValue }}</p>
    <hr>
    <h1>Current Value</h1>
    <p>{{ currentValue }}</p>
    <hr>
    <form @submit.prevent="set">
      <fieldset>
        <label for="newValue">New Value:</label>
        <input id="newValue" v-model="newValue" type="text" name="newValue">
      </fieldset>
      <button type="submit">
        Set New Value
      </button>
      <button @click.prevent="get">
        Refresh Current Value
      </button>
    </form>
    <p>Last message received: {{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'StatefulApiComponent',
  data: () => ({
    newValue: '',
    currentValue: '',
    previousValue: '',
    message: ''
  }),
  methods: {
    async set () {
      try {
        const setResult = await this.$axios.post('/state/set', { value: this.newValue })
        this.previousValue = setResult.data?.previous
        this.currentValue = setResult.data?.new
        this.newValue = ''
        this.message = ''
      } catch (e) {
        this.message = `Unable to set value: ${e.response.data}`
      }
    },
    async get () {
      try {
        const getResult = await this.$axios.get('/state/get')
        this.currentValue = getResult.data.value
        this.message = ''
      } catch (e) {
        this.message = `Unable to get value: ${e.response.data}`
      }
    }
  }
}
</script>
