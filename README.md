# Drupal Check - VS Code Extension

## Functionality

This Visual Studio Code extension highlights deprecated Drupal code.

![Screen shot](https://raw.githubusercontent.com/bbeversdorf/vscode-drupal-check/master/images/sample.png)

It relies on [drupal-check](https://github.com/mglaman/drupal-check)

## Install

Before installing the extension ensure [drupal-check](https://github.com/mglaman/drupal-check) is installed.

```bash
composer global require mglaman/drupal-check
```

In [Visual Studio Code](https://code.visualstudio.com/) settings, find the **Drupal Check: Executable Path** setting, and configure it to point to the `drupal-check` executable from your global Composer installation. For example:

```
/path/to/.composer/vendor/mglaman/drupal-check/drupal-check
```

_Note: Run `composer global show -P` to get a list global packages and their paths._

## Development Version

- Install the [Visual Studio Code](https://code.visualstudio.com/) [npm extension](https://marketplace.visualstudio.com/items?itemName=eg2.vscode-npm-script)
- Clone this repository.
- Open the repository directory using [Visual Studio Code](https://code.visualstudio.com/)
- Run VS Code task `npm install`

## Run/Debug Development Version

To get a development environment setup:

- Open workspace using [Visual Studio Code](https://code.visualstudio.com/)
- Then Terminal > `Run Build Task` (this should start `npm watch` and watch for .ts changes)
- Select sidebar option `Debug`
- Select and Run dropdown option `Launch Client`. This will launch another VSC window [Extension Development Host].
- Open a Drupal workspace/directory and a PHP file (this helps the LSP Server)
- Select and Run dropdown option `Attach to Server`.

## Acknowledgements

This extension was based off [Microsoft's Language Server Extension sample](https://github.com/Microsoft/vscode-extension-samples/tree/master/lsp-sample) and the VS Code [phpcs extension](https://github.com/ikappas/vscode-phpcs). And this extension would not be possible without [drupal-check](https://github.com/mglaman/drupal-check).

## Issues

Please file issues on [GitHub](https://github.com/bbeversdorf/vscode-drupal-check).
