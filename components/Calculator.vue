<template>
  <div class="calculator">
    <form @submit.prevent="calculate">
      <fieldset>
        <label for="operation">Operation:</label>
        <select id="operation" name="operation" v-model="operation">
          <option value="add">Add</option>
          <option value="subtract">Subtract</option>
          <option value="multiply">Multiply</option>
          <option value="divide">Divide</option>
        </select>
      </fieldset>
      <fieldset>
        <label for="x">First Value</label>
        <input type="number" name="x" id="x" v-model="x">
      </fieldset>
      <fieldset>
        <label for="y">Second Value</label>
        <input type="number" name="y" id="y" v-model="y">
      </fieldset>
      <button type="submit">Calculate</button>
    </form>
    <hr>
    <div class="result">{{ result }}</div>
  </div>
</template>

<script>
export default {
  name: 'ComponentCalculator',
  data: () => ({
    operation: 'add',
    x: 0,
    y: 0,
    result: 0
  }),
  methods: {
    async calculate () {
      try {
        const result = await this.$axios.get(`/api/${this.operation}/${this.x}/${this.y}`)
        this.result = result.data.data
      } catch (e) {
        this.result = `Error: ${e.response.data}`
      }
    }
  }
}
</script>
