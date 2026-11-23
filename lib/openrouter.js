// This optional integration deliberately permits free inference only.
function model(env = process.env) {
    return env.OPENROUTER_MODEL || 'openrouter/free';
}
function validModel(value) {
    return value === 'openrouter/free' || /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+:free$/.test(value);
}
module.exports = { model, validModel };
