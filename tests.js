fetch("http://172.16.2.252:8787/index_project", {
    method: "PUT",
    body: JSON.stringify({
        project: "AARON",
        version: "FOO",
        paths: [
            { 
                path: "x/y.z",
                text_fields: [
                    { field: "AAAA", value: "Hi, my name is Aaron" },
                    { field: "BBB.CCC", value: "and i have a problem" }
                ]
            },
            {
                path: "abc.txt",
                text_fields: [
                    { field: "DDD.CCC.EEE", value: "Hi AARON!" }
                ]
            }
        ]
    }),
    headers: {
        "Content-Type": "application/json"
    }
});
