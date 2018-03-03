function importTest(name, path)
{
  describe(name, () =>
  {
      require(path);
  });
}

importTest("Server test", './bin/server');
importTest("I18n test", './lib/i18n');
