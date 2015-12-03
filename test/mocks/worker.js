const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  key: 'mock-worker',

  async initialize() {
    await sleep(200);
  }
};
