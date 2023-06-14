import React from "react";
import { Text, Tooltip, useToast } from "@chakra-ui/react";

export default function ShortAddress({ address, fontSize = "xs", marginLeftSet = "auto" }: { address?: string; fontSize?: string; marginLeftSet?: string }) {
  const toast = useToast();
  const internalAddress = address || "";
  return (
    <Tooltip label="click to copy" aria-label="click to copy" fontSize={fontSize}>
      <Text
        ml={marginLeftSet}
        as={"span"}
        fontSize={fontSize}
        onClick={() => {
          navigator.clipboard.writeText(internalAddress);

          toast({
            title: "Address is copied to clipboard",
            status: "success",
            isClosable: true,
          });
        }}
        style={{ cursor: "pointer" }}>
        {`${internalAddress.substring(0, 6)}...${internalAddress.slice(-4)}`}
      </Text>
    </Tooltip>
  );
}