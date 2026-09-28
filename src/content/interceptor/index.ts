/**
 * MAIN-world entry point: patches `fetch`/`XMLHttpRequest` on load, then keeps the shared
 * rule gate's snapshot current from `rules-snapshot` messages posted by the bridge.
 */
import { createRuleGate } from './ruleGate';
import { installFetchInterceptor } from './installFetchInterceptor';
import { installXhrInterceptor } from './installXhrInterceptor';
import { isRulesSnapshotMessage } from '../../shared/messaging/validateRulesSnapshotMessage';

const ruleGate = createRuleGate();

installFetchInterceptor(ruleGate);
installXhrInterceptor(ruleGate);

window.addEventListener('message', (event) => {
	if (event.source !== window) {
		return;
	}
	if (!isRulesSnapshotMessage(event.data)) {
		return;
	}
	ruleGate.setSnapshot(event.data.payload);
});
