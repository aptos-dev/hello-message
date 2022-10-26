import { AptosClient, Types } from "aptos";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

/** Convert string to hex-encoded utf-8 bytes. */
function stringToHex(text: string) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  return Array.from(encoded, (i) => i.toString(16).padStart(2, "0")).join("");
}

function App() {
  // Retrieve aptos.account on initial render and store it.
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    window.aptos.isConnected().then((connected: Boolean) => {
      if (connected) {
        window.aptos
          .account()
          .then((data: { address: string }) => setAddress(data.address));
      } else {
        window.aptos.connect();
      }
    });
  }, []);

  const [account, setAccount] = useState<Types.AccountData | null>(null);
  useEffect(() => {
    if (!address) return;
    client.getAccount(address).then(setAccount);
  }, [address]);

  const [modules, setModules] = useState<Types.MoveModuleBytecode[]>([]);

  useEffect(() => {
    if (!address) return;
    client.getAccountModules(address).then(setModules);
  }, [address]);

  const hasModule = modules.some((m) => m.abi?.name === "message");

  const publishInstructions = (
    <pre>
      Run this command to publish the module:
      <br />
      aptos move publish --package-dir /path/to/hello_blockchain/
      --named-addresses HelloBlockchain={address}
    </pre>
  );

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = useCallback(async () => {
    if (isSaving) return;
    if (!address || !message) return;

    const transaction: Types.EntryFunctionPayload = {
      function: `${address}::message::set_message`,
      arguments: [message],
      type_arguments: [],
    };
    try {
      setIsSaving(true);
      await window.aptos.signAndSubmitTransaction(transaction);
    } finally {
      setIsSaving(false);
    }
  }, [address, isSaving, message]);

  const [resources, setResources] = useState<Types.MoveResource[]>([]);

  useEffect(() => {
    if (!address) return;
    client.getAccountResources(address).then(setResources);
  }, [address]);

  useEffect(() => {
    const resource = resources.find(
      (r) => r.type === `${address}::message::MessageHolder`
    );
    const data = resource?.data as { message: string } | undefined;
    setMessage(data?.message ?? "");
  }, [address, resources]);

  return (
    <div className="App">
      <p>
        <code>{address}</code>
      </p>
      <p>
        <code>{account?.sequence_number}</code>
      </p>

      {hasModule ? (
        <div>
          <textarea
            className="message-area"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={handleSubmit}>Update</button>
        </div>
      ) : (
        publishInstructions
      )}
    </div>
  );
}

export default App;
