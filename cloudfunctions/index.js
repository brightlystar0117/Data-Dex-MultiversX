const logger = Moralis.Cloud.getLogger();

Moralis.Cloud.define("saveSellerDataToFile", async (request) => {
  logger.info("saveSellerDataToFile called...");
  
  const sellerData = request.params.sellerData;
  const dataHash = crypto.createHash('sha256').update(sellerData).digest('hex');
  
  return {
    dataHash
  };
});

Moralis.Cloud.define("loadTestData", async (request) => {
  logger.info("loadTestData called...");
                                     
  return "JTdCJTIybGFzdE5hbWUlMjIlM0ElMjJVc2VyJTIyJTJDJTIyZmlyc3ROYW1lJTIyJTNBJTIyRGV4RGVtbyUyMiUyQyUyMnByb2dyYW1zQWxsb2NhdGlvbiUyMiUzQSU1QiU3QiUyMnByb2dyYW0lMjIlM0ElMjJlZjYyYzIyMC01MGUxLTExZTctOWJkMi0yZjMzNjgwYTY2YjYlMjIlMkMlMjJzdGF0dXMlMjIlM0ElMjJzdG9wJTIyJTJDJTIyc2hvcnRJZCUyMiUzQSUyMjElMjIlMkMlMjJ0eXBlJTIyJTNBJTIyMSUyMiUyQyUyMmZyb21UcyUyMiUzQTE0OTc1MjAxNzI1NDklMkMlMjJ0b1RzJTIyJTNBMTUzNjQwMjg5NzEyMyU3RCUyQyU3QiUyMnByb2dyYW0lMjIlM0ElMjJiYzljZTNlMC04ZjAwLTExZTctYjFmZi05ZmVmODNmYzhhNDIlMjIlMkMlMjJzdGF0dXMlMjIlM0ElMjJzdG9wJTIyJTJDJTIyc2hvcnRJZCUyMiUzQSUyMjElMjIlMkMlMjJ0eXBlJTIyJTNBJTIyMSUyMiUyQyUyMmZyb21UcyUyMiUzQTE1MDQyNjIxMTI5NzglMkMlMjJ0b1RzJTIyJTNBMTUzNTYwNzA4OTc0NyU3RCUyQyU3QiUyMnByb2dyYW0lMjIlM0ElMjIyNTUzYzNiMC01MWIwLTExZTctOWJkMi0yZjMzNjgwYTY2YjYlMjIlMkMlMjJzdGF0dXMlMjIlM0ElMjJzdG9wJTIyJTJDJTIyc2hvcnRJZCUyMiUzQSUyMjElMjIlMkMlMjJ0eXBlJTIyJTNBJTIyMSUyMiUyQyUyMmZyb21UcyUyMiUzQTE1Mjg0NDgwMjY3ODQlMkMlMjJ0b1RzJTIyJTNBMTUzNTk1MTc1MzMwNSU3RCUyQyU3QiUyMnByb2dyYW0lMjIlM0ElMjIxODNmMDI5MC1mNzI2LTExZTctOTE4Ni0zYmNiNWM1ZDIyZGIlMjIlMkMlMjJzdGF0dXMlMjIlM0ElMjJzdG9wJTIyJTJDJTIyc2hvcnRJZCUyMiUzQSUyMjElMjIlMkMlMjJ0eXBlJTIyJTNBJTIyMyUyMiUyQyUyMmZyb21UcyUyMiUzQTE1MTU3MTM1NzMyOTElMkMlMjJ0b1RzJTIyJTNBMTU4MjY1OTYzNDcxOCU3RCUyQyU3QiUyMnByb2dyYW0lMjIlM0ElMjI3MGRjNmJkMC01OWIwLTExZTgtOGQ1NC0yZDU2MmY2Y2JhNTQlMjIlMkMlMjJzdGF0dXMlMjIlM0ElMjJjb21wbGV0ZSUyMiUyQyUyMnNob3J0SWQlMjIlM0ElMjIxJTIyJTJDJTIydHlwZSUyMiUzQSUyMjElM0EzJTIyJTJDJTIyZnJvbVRzJTIyJTNBMTU0MzgzNTM2MzY0MyUyQyUyMnRvVHMlMjIlM0ExNTQ2MDczOTY1Njk0JTdEJTJDJTdCJTIycHJvZ3JhbSUyMiUzQSUyMjQ3NmFiODQwLTFjYjctMTFlOS04NGZlLWU5MzViMzY1MjIwYSUyMiUyQyUyMnN0YXR1cyUyMiUzQSUyMmFjdGl2ZSUyMiUyQyUyMnNob3J0SWQlMjIlM0ElMjIxJTIyJTJDJTIydHlwZSUyMiUzQSUyMjElMjIlMkMlMjJmcm9tVHMlMjIlM0ExNTQ4MDQzMjkyMTg4JTJDJTIydG9UcyUyMiUzQTE2MjMxNTQ0MDkzMTElN0QlMkMlN0IlMjJwcm9ncmFtJTIyJTNBJTIyNDhkN2IwMjAtZWFiMC0xMWVhLWE0NjYtMDMzNGZmMGU4YmYyJTIyJTJDJTIyc3RhdHVzJTIyJTNBJTIyYWN0aXZlJTIyJTJDJTIyc2hvcnRJZCUyMiUzQSUyMjEwNCUyMiUyQyUyMnR5cGUlMjIlM0ElMjIzJTIyJTJDJTIyZnJvbVRzJTIyJTNBMTU5ODc4NjIyMDkxNSUyQyUyMnRvVHMlMjIlM0ExNjIzMTU0NDA5MzExJTdEJTVEJTJDJTIyX2xvb2t1cHMlMjIlM0ElN0IlMjJwcm9ncmFtcyUyMiUzQSU3QiUyMmJjOWNlM2UwLThmMDAtMTFlNy1iMWZmLTlmZWY4M2ZjOGE0MiUyMiUzQSU3QiUyMnByb2dyYW1OYW1lJTIyJTNBJTIySHlwZXJ0ZW5zaW9uJTIwSW5zaWdodHMlMjBJbnRlbnNlJTIyJTJDJTIyaW1nJTIyJTNBJTIyaGlpJTIyJTJDJTIyZGVzY3JpcHRpb24lMjIlM0ElMjJUaGlzJTIwSW50ZW5zZSUyMHByb2dyYW0lMjBhaW1zJTIwdG8lMjBwcm9kdWNlJTIwc29tZSUyMGJsb29kJTIwcHJlc3N1cmUlMjBpbnNpZ2h0cyUyMGZvciUyMG91ciUyMHBhdGllbnQlMjBiYXNlLiUyMFRoZXNlJTIwaW5zaWdodHMlMjBjYW4lMjB0aGVuJTIwYmUlMjB1c2VkJTIwdG8lMjB0ZXN0JTIwc29tZSUyMEh5cG90aGVzaXMlMjByZWxhdGluZyUyMHRvJTIwdGhlJTIwJUUyJTgwJTlDRGFuZ2VycyUyMG9mJTIwTW9ybmluZyUyMEJsb29kJTIwUHJlc3N1cmUlRTIlODAlOUQlMkMlMjAlNUMlMjJVbnVzdWFsJTIwdHJlbmRzJTIwaW4lMjBBcm0lMjB0byUyMEFybSUyMEJQJTIwZGlmZmVyZW5jZSU1QyUyMiUyMGFzJTIwd2VsbCUyMGlzJTIwdGhlJTIwdHJlYXRtZW50JTIwcGxhbiUyMGElMjBQYXRpZW50JTIwb24lMjByZWFsbHklMjBjb250cm9sbGluZyUyMHRoZWlyJTIwQmxvb2QlMjBQcmVzc3VyZS4lMjAlNUNuJTVDbkF0JTIwdGhlJTIwZW5kJTIwb2YlMjB0aGUlMjBQcm9ncmFtJTIwdGhlJTIwUGF0ZW50JTIwd2lsbCUyMHJlY2VpdmUlMjBhJTIwcmVwb3J0JTIwYnklMjBwb3N0JTIwd2hpY2glMjB3ZSUyMHdpbGwlMjByZWNvbW1lbmQlMjB0aGVuJTIwdGFrZSUyMHRvJTIwdGhlaXIlMjBHUCUyMG9yJTIwU3BlY2lhbGlzdC4lMjAlMjIlMkMlMjJkdXJhdGlvbiUyMiUzQSUyMjJfd2Vla3MlMjIlN0QlMkMlMjI0NzZhYjg0MC0xY2I3LTExZTktODRmZS1lOTM1YjM2NTIyMGElMjIlM0ElN0IlMjJwcm9ncmFtTmFtZSUyMiUzQSUyMkJsb29kJTIwUHJlc3N1cmUlMjBPbkRlbWFuZCUyMiUyQyUyMmltZyUyMiUzQSUyMmJwbyUyMiUyQyUyMmRlc2NyaXB0aW9uJTIyJTNBJTIyQSUyMHByb2dyYW0lMjBmb3IlMjB1c2VycyUyMHRvJTIwbG9nJTIwYW5kJTIwY2hlY2slMjBibG9vZCUyMHByZXNzdXJlJTIwYXMlMjB0aGV5JTIwZmVlbC4lMjIlMkMlMjJkdXJhdGlvbiUyMiUzQSUyMm9uZ29pbmclMjIlN0QlMkMlMjIyNTUzYzNiMC01MWIwLTExZTctOWJkMi0yZjMzNjgwYTY2YjYlMjIlM0ElN0IlMjJwcm9ncmFtTmFtZSUyMiUzQSUyMlByZWduYW5jeSUyMENvbmRpdGlvbiUyME1vbml0b3JpbmclMjIlMkMlMjJpbWclMjIlM0ElMjJwY20lMjIlMkMlMjJkZXNjcmlwdGlvbiUyMiUzQSUyMk5ldyUyMEh5cGVydGVuc2lvbiUyMG9jY3VycyUyMGluJTIwOC0xMCUyNSUyMG9mJTIwcHJlZ25hbmNpZXMlMjBhbmQlMjBtYW55JTIwd29tZW4lMjBkZXZlbG9wJTIwZGVwcmVzc2lvbiUyMGR1cmluZyUyMHRoaXMlMjBwZXJpb2QuJTIyJTJDJTIyZHVyYXRpb24lMjIlM0ElMjIzMF93ZWVrcyUyMiU3RCUyQyUyMjcwZGM2YmQwLTU5YjAtMTFlOC04ZDU0LTJkNTYyZjZjYmE1NCUyMiUzQSU3QiUyMnByb2dyYW1OYW1lJTIyJTNBJTIyUmVkJTIwSGVhcnQlMjBDaGFsbGVuZ2UlMjIlMkMlMjJpbWclMjIlM0ElMjJyaGMlMjIlMkMlMjJkZXNjcmlwdGlvbiUyMiUzQSUyMkElMjAzJTIwd2VlayUyMGNoYWxsZW5nZSUyMHRvJTIwZ2VuZXJhdGUlMjBzb21lJTIwSGVhcnQlMjBIZWFsdGglMjBpbnNpZ2h0cyUyMGJ5JTIwY29sbGVjdGluZyUyMEJsb29kJTIwUHJlc3N1cmUlMjByZWFkaW5ncyUyQyUyMFN0cmVzcyUyMFJlYWRpbmdzJTIwZXRjJTIyJTJDJTIyZHVyYXRpb24lMjIlM0ElMjIzX3dlZWtzJTIyJTdEJTJDJTIyMTgzZjAyOTAtZjcyNi0xMWU3LTkxODYtM2JjYjVjNWQyMmRiJTIyJTNBJTdCJTIycHJvZ3JhbU5hbWUlMjIlM0ElMjJDaHJvbmljJTIwV291bmRzJTIwSGVhbGluZyUyMFByb2dyZXNzJTIwVHJhY2tlciUyMiUyQyUyMmRlc2NyaXB0aW9uJTIyJTNBJTIyQ2hyb25pYyUyMFdvdW5kcyUyMEhlYWxpbmclMjBQcm9ncmVzcyUyMFRyYWNrZXIlMjIlMkMlMjJpbWclMjIlM0ElMjJjd2glMjIlMkMlMjJkdXJhdGlvbiUyMiUzQSUyMjRfd2Vla3MlMjIlN0QlMkMlMjJlZjYyYzIyMC01MGUxLTExZTctOWJkMi0yZjMzNjgwYTY2YjYlMjIlM0ElN0IlMjJwcm9ncmFtTmFtZSUyMiUzQSUyMkJsb29kJTIwUHJlc3N1cmUlMjBUcmFja2VyJTIyJTJDJTIyaW1nJTIyJTNBJTIyYnB0JTIyJTJDJTIyZGVzY3JpcHRpb24lMjIlM0ElMjJIeXBlcnRlbnNpb24lMjBpcyUyMGRlZmluZWQlMjBhcyUyMGElMjBzeXN0b2xpYyUyMGJsb29kJTIwcHJlc3N1cmUlMjBvZiUyMDE0MCUyMG1tJTIwSGclMjBvciUyMG1vcmUlMkMlMjBvciUyMGElMjBkaWFzdG9saWMlMjBibG9vZCUyMHByZXNzdXJlJTIwb2YlMjA5MCUyMG1tJTIwSGclMjBvciUyMG1vcmUlMkMlMjBvciUyMHRha2luZyUyMGFudGloeXBlcnRlbnNpdmUlMjBtZWRpY2F0aW9uLiUyMEl0JTIwaXMlMjBlc3RpbWF0ZWQlMjB0aGF0JTIwMSUyMGluJTIwMyUyMHBlb3BsZSUyMGdsb2JhbGx5JTIwc3VwcGVyJTIwZnJvbSUyMEh5cGVydGVuc2lvbi4lNUNuJTVDblRoaXMlMjBQcm9ncmFtJTIwaXMlMjB0byUyMGhlbHAlMjBhbnlvbmUlMjBsaXZpbmclMjB3aXRoJTIwSHlwZXJ0ZW5zaW9uJTIwb3IlMjBNaWxkJTIwSHlwZXJ0ZW5zaW9uJTIwdG8lMjBiZXR0ZXIlMjBtYW5nZXIlMjB0aGVpciUyMGNvbmRpdGlvbiUyMHdpdGglMjBwcm9hY3RpdmUlMjBtb25pdG9yaW5nJTIwYW5kJTIwdHJhY2tpbmcuJTIwSXQncyUyMGFsc28lMjBkZXNpZ25lZCUyMHRvJTIwaGVscCUyMGFueW9uZSUyMHRyYWNrJTIwYW5kJTIwbW9uaXRvciUyMHRoZWlyJTIwbG92ZWQlMjBvbmVzJTIwbGl2aW5nJTIwd2l0aCUyMHRoaXMlMjBjb25kaXRpb24lMjBhcyUyMHdlbGwuJTIyJTJDJTIyZHVyYXRpb24lMjIlM0ElMjJvbmdvaW5nJTIyJTdEJTJDJTIyNDhkN2IwMjAtZWFiMC0xMWVhLWE0NjYtMDMzNGZmMGU4YmYyJTIyJTNBJTdCJTIycHJvZ3JhbU5hbWUlMjIlM0ElMjJPa1B1bHNlJTIyJTJDJTIyaW1nJTIyJTNBJTIyb2twdWxzZSUyMiUyQyUyMmRlc2NyaXB0aW9uJTIyJTNBJTIyV2UlMjB3b3VsZCUyMGxpa2UlMjB0byUyMHVuZGVyc3RhbmQlMjBob3clMjB3ZSUyMGNhbiUyMGJlc3QlMjBzdXBwb3J0JTIweW91JTIwYXMlMjB5b3UlMjB3b3JrJTIwcmVtb3RlbHkuJTIwVGhpcyUyMHByb2dyYW0lMjBwcm92aWRlcyUyMHVzJTIwd2l0aCUyMGElMjBsaXZpbmclMjBwdWxzZSUyMG9uJTIweW91ciUyMG1vdGl2YXRpb24lMkMlMjBwcm9kdWN0aXZpdHklMkMlMjBlbmdhZ2VtZW50JTIwbGV2ZWxzJTIwYW5kJTIwZ2VuZXJhbCUyMGhlYWx0aCUyMGFuZCUyMHdlbGxiZWluZy4lMjIlMkMlMjJkdXJhdGlvbiUyMiUzQSUyMm9uZ29pbmclMjIlN0QlN0QlN0QlN0Q=";
});

Moralis.Cloud.define("getUserPurchaseDataOrders", function(request) {
  logger.info("getUserPurchaseDataOrders called...");

  const userAddress = request.params.userAddress;
  const networkId = request.params.networkId;

  const query = new Moralis.Query("DataOrder");
  query.descending("createdAt");
  query.equalTo("txNetworkId", networkId);
  
  const pipeline = [
    {match: {$expr: {$or: [
      {$eq: ["$buyerEthAddress", userAddress]},
    ]}}},
    
    {lookup: {
      from: "DataPack",
      localField: "dataPackId",
      foreignField: "_id",
      as: "dataPack"
    }}
  ];
  
  return query.aggregate(pipeline);
});

Moralis.Cloud.define("getUserDataNFTCatalog", async (request) => {
  logger.info("6 getUserDataNFTCatalog called...");

  const {myOnChainNFTs, networkId, ethAddress} = request.params;

  const query = new Moralis.Query("DataNFT");
  query.descending("createdAt");
  query.notEqualTo("txHash", null);
  query.equalTo("txNetworkId", networkId);
  query.equalTo("sellerEthAddress", ethAddress);

  const allUserDataNFTs = await query.find();

  // we no need iterate and tag the ones the user still owns vs sold
  if (myOnChainNFTs.length > 0) {
    for (let i = 0; i < allUserDataNFTs.length; ++i) {
      if (myOnChainNFTs.includes(allUserDataNFTs[i].get("txNFTId"))) {
        allUserDataNFTs[i].set("stillOwns", true);
      }
    }
  }

  logger.info("allUserDataNFTs");
  logger.info(allUserDataNFTs.length);

  return allUserDataNFTs;
});
