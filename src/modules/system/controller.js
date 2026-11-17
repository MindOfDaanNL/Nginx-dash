const systemService = require('../../services/systemService');

async function getStatus(req, res) {
  const result = await systemService.getStatus();
  return res.json(result);
}

async function start(req, res) {
  const result = await systemService.start();
  return res.json(result);
}

async function stop(req, res) {
  const result = await systemService.stop();
  return res.json(result);
}

async function restart(req, res) {
  const result = await systemService.restart();
  return res.json(result);
}

async function reload(req, res) {
  const result = await systemService.reload();
  return res.json(result);
}

async function test(req, res) {
  const result = await systemService.test();
  return res.json(result);
}

async function systemPage(req, res) {
  const status = await systemService.getStatus();
  return res.render('pages/system-body', { title: 'Systeembeheer', activePage: 'system', status });
}

module.exports = {
  getStatus,
  start,
  stop,
  restart,
  reload,
  test,
  systemPage,
}