
function hasPermission(permission) {
  return browser.permissions.contains({ permissions: [permission] });
}

export { hasPermission };
