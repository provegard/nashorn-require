exports.isMain = function () {
  return require.main === module;
};