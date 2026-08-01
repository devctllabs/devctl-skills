export default class StaticOutputProvider {
  constructor(options = {}) {
    this.providerId = options.id ?? "static-output";
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt) {
    return { output: prompt };
  }
}
