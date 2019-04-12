# Drupal Check - VS Code Extension

## Functionality
This Visual Studio Code extension highlights deprecated Drupal code.
![](sample.png)

It relies on [drupal-check](https://github.com/mglaman/drupal-check)

## Install
Before installing the extension ensure [drupal-check](https://github.com/mglaman/drupal-check) is installed.

```
curl -O -L https://github.com/mglaman/drupal-check/releases/latest/download/drupal-check.phar
mv drupal-check.phar /usr/local/bin/drupal-check
chmod +x /usr/local/bin/drupal-check
```

## Acknowledgements
This extension was based off [Microsoft's Language Server Extension sample](https://github.com/Microsoft/vscode-extension-samples/tree/master/lsp-sample) and the VS Code [phpcs extension](https://github.com/ikappas/vscode-phpcs)



