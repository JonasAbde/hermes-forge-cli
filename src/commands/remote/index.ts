import { Command } from 'commander';
import remoteStatus from './status.js'; import remotePacks from './packs.js'; import remoteMe from './me.js'; import remoteLogin from './login.js';
const p = new Command('remote').description('Interact with remote forge.tekup.dk instance')
  .addCommand(remoteStatus).addCommand(remotePacks).addCommand(remoteMe).addCommand(remoteLogin);
export default p;
