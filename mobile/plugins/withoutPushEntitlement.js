// Removes the Push Notifications entitlement that Expo adds whenever expo-notifications is installed.
// Reprummble only uses reminders scheduled on the phone, which need no push entitlement, and a free Apple developer
// account cannot sign an app that has it. Delete this plugin once the app is built with a paid Apple Developer account
// and server push notifications are wanted.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
