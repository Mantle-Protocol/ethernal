<template>
    <v-row>
        <template v-if="step.depth > 1">
            <v-col v-for="(n, idx) in new Array(step.depth)" :key="idx" cols="1">
            </v-col>
        </template>
        <v-col class="pb-0" style="overflow-y: auto;" :key="step.depth">
            <v-card flat>
                <v-card-text class="pa-0 ma-0">
                    <span class="font-weight-black">
                        |<br>
                        |-->
                    </span>
                    <v-chip small class="primary mr-2">{{ this.step.op }}</v-chip>
                    <v-chip v-if="this.step.contract && this.step.contract.proxyContract" small class="primary mr-2">PROXY</v-chip>
                    <Hash-Link :type="'address'" :hash="step.address" :notCopiable="true" :fullHash="true" :withName="true" /><span v-if="transactionDescription">.{{ transactionDescription.functionFragment.name }}(</span>
                    <template v-if="transactionDescription">
                        <div v-for="(input, index) in transactionDescription.functionFragment.inputs" :key="`in-${index}`">
                            <Formatted-Sol-Var :input="input" :value="transactionDescription.args[index]" class="ml-8" />
                        </div><span class="ml-4">)</span>
                        <template v-if="transactionDescription.functionFragment.outputs.length">
                            <template v-if="transactionDescription.functionFragment.outputs.length > 0">
                                =>
                            </template>
                            <template v-if="transactionDescription.functionFragment.outputs.length > 1 ">
                                (<div v-for="(output, index) in transactionDescription.functionFragment.outputs" :key="`out-${index}`">
                                    <Formatted-Sol-Var :input="output" :value="decodeOutput(index)" />
                                </div>)
                            </template>
                            <template v-else>
                                <Formatted-Sol-Var :input="transactionDescription.functionFragment.outputs[0]" :value="decodeOutput(0)" />
                            </template>
                        </template>
                    </template>
                    <template v-else>
                        <ul>
                            <li><b>Input:</b> {{ step.input }}</li>
                            <li><b>Output:</b> {{ step.returnData }}</li>
                        </ul>
                    </template>
                </v-card-text>
            </v-card>
        </v-col>
    </v-row>
</template>
<script>
import { ethers } from 'ethers';

import HashLink from './HashLink';
import FormattedSolVar from './FormattedSolVar';

export default {
    name: 'TraceStep',
    components: {
        HashLink,
        FormattedSolVar
    },
    props: ['step'],
    data: () => ({
        transactionDescription: null,
        jsonInterface: null,
        outputs: null,
        calledContract: null,
        proxyContract: null
    }),
    methods: {
        zeroXify: function(input) { return input.startsWith('0x') ? input : `0x${input}` },
        decodeOutput: function(index) {
            if (!this.step.returnData) return '';
            return this.jsonInterface.decodeFunctionResult(this.transactionDescription.functionFragment, this.zeroXify(this.step.returnData))[index];
        }
    },
    watch: {
        'step.contract': {
            immediate: true,
            handler() {
                if (!this.step.contract) return;
                if (this.step.input && this.step.contract.abi) {
                    try {
                        const contract = this.step.contract.proxyContract ? this.step.contract.proxyContract : this.step.contract;
                        this.jsonInterface = new ethers.utils.Interface(contract.abi);
                        this.transactionDescription = this.jsonInterface.parseTransaction({ data: this.zeroXify(this.step.input) });
                    } catch(_error) {
                        console.log(_error)
                    }
                }
            }
        }
    }

};
</script>
