"use strict";
// A fresh, disposable OpenCode session environment per model attempt.
// Deliberately never removes or modifies user/global OpenCode sessions.
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");

const GEO_AGENT_RULES=`# Isolated GEO CI agent rules

You are researching PUBLIC Saudi investor-services content only. The supplied
topic tree and evidence bundle define the available knowledge for this run.
- Reply with compact JSON only. Do not create long conversational histories.
- Regulatory, legal, banking and fee assertions require currently checked
  official-source evidence. Never invent a source, URL, date or evidence ID.
- Competitor observations and keyword suggestions are research leads, NOT
  authority-verified sources. If evidence is insufficient, propose a research
  goal instead of asserting regulatory facts or filling space.
- FAQ responses must answer the question directly and contain meaningful
  information in the requested language; omit unsupported answers.
- Never auto-approve or publish output, fill verified_sources, modify site
  prices, or claim ranking, citations, approvals or commercial outcomes.
- Do not read unrelated files, credentials, hidden project files or user
  information. Do not invoke external paid APIs or modify the repository.
- Each request is independent. Never continue/reuse a previous session.`;

const GEO_COMPACTION_CONFIG={
  $schema:"https://opencode.ai/config.json",
  compaction:{auto:true,keep:{tokens:4000},buffer:"25%"}
};

function createIsolatedGeoWorkspace(prompt,projectRoot=path.join(__dirname,"..")){
  if(typeof prompt!=="string"||!prompt.trim())throw Error("GEO prompt must be nonempty");
  const workDir=fs.mkdtempSync(path.join(os.tmpdir(),"geo-opencode-"));
  try{
    fs.writeFileSync(path.join(workDir,"prompt.txt"),prompt,{encoding:"utf8",mode:0o600});
    fs.writeFileSync(path.join(workDir,"AGENTS.md"),GEO_AGENT_RULES,{encoding:"utf8",mode:0o600});
    fs.writeFileSync(path.join(workDir,"opencode.json"),JSON.stringify(GEO_COMPACTION_CONFIG,null,2),{encoding:"utf8",mode:0o600});
    const skillSource=path.join(projectRoot,".opencode","skills","content-architecture","SKILL.md");
    if(fs.existsSync(skillSource)){
      const skillRoot=path.join(workDir,".opencode","skills","content-architecture");
      fs.mkdirSync(skillRoot,{recursive:true});
      fs.copyFileSync(skillSource,path.join(skillRoot,"SKILL.md"));
    }
    const storage=path.join(workDir,".isolated-storage");
    return {
      workDir,
      runtimeEnv:{
        HOME:workDir,
        XDG_CONFIG_HOME:path.join(storage,"config"),
        XDG_DATA_HOME:path.join(storage,"data"),
        XDG_STATE_HOME:path.join(storage,"state"),
        XDG_CACHE_HOME:path.join(storage,"cache"),
        OPENCODE_DB:path.join(storage,"data","opencode","opencode.db")
      },
      cleanup:()=>fs.rmSync(workDir,{recursive:true,force:true})
    };
  }catch(error){
    fs.rmSync(workDir,{recursive:true,force:true});
    throw error;
  }
}
module.exports={createIsolatedGeoWorkspace,GEO_COMPACTION_CONFIG};
