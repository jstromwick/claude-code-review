import * as core from "@actions/core";

export class Logger {
  public log(message: string): void {
    core.info(message);
  }

  public warn(message: string): void {
    core.warning(message);
  }

  public error(message: string): void {
    core.error(message);
  }

  public debug(message: string): void {
    core.debug(message);
  }
}
