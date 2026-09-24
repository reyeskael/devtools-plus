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
