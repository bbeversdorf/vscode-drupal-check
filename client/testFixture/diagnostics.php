<?php
/**
 * Test drupal-check
 * PHP version 7
 *
 * @category Testing
 * @package  Vscodedrupalcheck
 * @author   Brian Beversdorf <bbeversdorf@gowithfloat.com>
 * @license  MIT https://opensource.org/licenses/MIT
 * @version  GIT: 0.0.1
 * @link     https://github.com/bbeversdorf/vscode-drupal-check
 */


SafeMarkup.isSafe("No");
drupal_clear_css_cache();
drupal_set_message("1234");
