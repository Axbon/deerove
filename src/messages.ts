const withLogging = (fnMessage: Function) => {
  return fnMessage;
};

export const messages = {
  created: withLogging((msg: string) =>
    console.log(`\x1b[35m [MIGRATION]: Created  ${msg}\n - `)
  ),
  applying: withLogging((msgs: string[]) => {
    if (msgs.length === 0) {
      return console.log(`\x1b[35m [NOOP]: No migrations to run\n`);
    }
    return console.log(`\x1b[35m [MIGRATED]: \n - ${msgs.join("\n - ")}\n`);
  }),
  reverting: withLogging((msgs: string[]) => {
    if (msgs.length === 0) {
      return console.log(`\x1b[36m [NOOP]: No migrations to revert \n`);
    }
    return console.log(`\x1b[36m [REVERTED]: \n - ${msgs.join("\n - ")}\n`);
  }),
  noneToRevert: withLogging(() =>
    console.log(`\x1b[36m [MIGRATIONS] No migrations to revert.`)
  ),
  rollback: withLogging((msg: string) =>
    console.log(
      `\x1b[31m [ERROR] - An error occured during migrations. No migrations were made. Error message: \n* ${msg}\n`
    )
  ),
  error: withLogging((msg: string) => console.log(`\x1b[31m [ERROR] ${msg}\n`)),
};
