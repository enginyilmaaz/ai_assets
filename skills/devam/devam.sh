#!/usr/bin/env bash
# devam helper — list / find / digest Claude Code sessions across all projects.
# Subcommands:  list [filter] | find <id-prefix> | digest <id-prefix>
# Env: LIMIT (list rows, default 40), CURRENT (current session id → marks «this session»), TAIL (digest turns, default 24)
set -uo pipefail
PROJECTS="$HOME/.claude/projects"
CMD="${1:-list}"; shift 2>/dev/null || true

JQDEFS='
  def ht:
    (.message.content) as $c
    | if ($c|type)=="string" then $c
      elif ($c|type)=="array" then ([ $c[]? | select(.type=="text") | .text ] | join(" "))
      else "" end;
  def clean: gsub("[\n\r\t]+";" ");
  def synthetic: (ltrimstr(" "))
    | (.=="") or startswith("<") or startswith("Base directory for this skill:")
      or startswith("Caveat:") or startswith("[Request interrupted") or startswith("API Error");
'

extract() { # $1=path -> title \t cwd \t first(clean human)
  jq -rn "$JQDEFS"'
    reduce inputs as $x ({t:"",c:"",u:""};
        (if ($x.type=="ai-title" and ($x.aiTitle//"")!="") then .t=$x.aiTitle else . end)
      | (if (.c=="" and ($x.cwd//"")!="") then .c=$x.cwd else . end)
      | (if (.u=="" and $x.type=="user") then ($x|ht) as $t
           | (if (($t|gsub("[ \n\r\t]";"")|length)>0 and (($t|synthetic)|not)) then .u=$t else . end)
         else . end) )
    | [ (if .t!="" then .t else .u end), .c, .u ] | map(clean) | @tsv
  ' "$1" 2>/dev/null
}

resolve() { # $1=id/prefix -> prints path(s); rc 0 single / 1 none / 2 ambiguous
  local id="$1"; local -a m
  mapfile -t m < <(find "$PROJECTS" -maxdepth 2 -name "${id}*.jsonl" 2>/dev/null)
  case ${#m[@]} in
    0) return 1;; 1) printf '%s\n' "${m[0]}"; return 0;; *) printf '%s\n' "${m[@]}"; return 2;;
  esac
}

cmd_list() {
  local FILTER="${1:-}" LIMIT="${LIMIT:-40}" CURRENT="${CURRENT:-}"
  local -a PATHS
  if [[ -n "$FILTER" ]]; then
    mapfile -t PATHS < <(
      grep -raF '"type":"ai-title"' --include='*.jsonl' "$PROJECTS" 2>/dev/null \
      | awk -v pat="$FILTER" '{ i=index($0,".jsonl:"); if(i==0) next;
          path=substr($0,1,i+5); j=substr($0,i+7);
          t=j; sub(/.*"aiTitle":"/,"",t); sub(/".*/,"",t);
          if (index(tolower(t),tolower(pat))>0) print path }' \
      | awk '!s[$0]++' \
      | while IFS= read -r p; do printf '%s\t%s\n' "$(stat -c '%Y' "$p" 2>/dev/null)" "$p"; done \
      | sort -rn | cut -f2- | head -n "$LIMIT" )
  else
    mapfile -t PATHS < <(find "$PROJECTS" -maxdepth 2 -name '*.jsonl' -printf '%T@\t%p\n' 2>/dev/null \
      | sort -rn | cut -f2- | head -n "$LIMIT")
  fi
  printf '%-3s  %-13s  %-44s  %-26s  %-8s\n' '#' 'Last active' 'Title' 'Project' 'id'
  printf '%s\n' '--------------------------------------------------------------------------------------------------------------'
  local i=0 path id title cwd first epoch when proj mark
  for path in "${PATHS[@]}"; do
    [[ -f "$path" ]] || continue
    IFS=$'\t' read -r title cwd first < <(extract "$path")
    id="$(basename "$path" .jsonl)"
    epoch="$(stat -c '%Y' "$path" 2>/dev/null)"; when="$(date -d "@${epoch}" '+%d %b %H:%M' 2>/dev/null)"
    [[ -z "${title// }" ]] && title='(untitled)'
    proj="${cwd/#$HOME/\~}"; [[ -z "${proj// }" ]] && proj='?'
    mark=''; [[ -n "$CURRENT" && "$id" == "$CURRENT"* ]] && mark=' «this session»'
    ((i++)); printf '%-3s  %-13s  %-44s  %-26s  %-8.8s%s\n' "$i" "$when" "${title:0:44}" "${proj:0:26}" "$id" "$mark"
  done
  echo
  if [[ $i -eq 0 ]]; then [[ -n "$FILTER" ]] && echo "(no matches — filter searches titles)" || echo "(no sessions found)"; else echo "(shown: $i)"; fi
}

cmd_digest() {
  local id="$1" TAIL="${TAIL:-24}" P rc
  if ! P="$(resolve "$id")"; then
    rc=$?
    if [[ $rc -eq 1 ]]; then echo "NOT FOUND: $id"; else echo "AMBIGUOUS matches:"; printf '%s\n' "$P" | sed 's:.*/::'; fi
    return $rc
  fi
  echo "FILE: $P"
  echo "=========== META ==========="
  jq -rn "$JQDEFS"'
    reduce inputs as $x ({t:"",c:"",b:"",lp:"",first:"",n:0};
        (if ($x.type=="ai-title" and ($x.aiTitle//"")!="") then .t=$x.aiTitle else . end)
      | (if (.c=="" and ($x.cwd//"")!="") then .c=$x.cwd else . end)
      | (if (.b=="" and ($x.gitBranch//"")!="") then .b=$x.gitBranch else . end)
      | (if (($x.lastPrompt//"")!="") then .lp=$x.lastPrompt else . end)
      | (if ($x.type=="user" or $x.type=="assistant") then .n=(.n+1) else . end)
      | (if (.first=="" and $x.type=="user") then ($x|ht) as $t
           | (if (($t|gsub("[ \n\r\t]";"")|length)>0 and (($t|synthetic)|not)) then .first=$t else . end)
         else . end) )
    | "TITLE : \(.t)\nFOLDER: \(.c)\nBRANCH: \(.b)\nTURNS : \(.n)\nFIRST REQUEST: \((.first|clean)[0:200])\nLAST PROMPT  : \((.lp|clean)[0:300])"
  ' "$P" 2>/dev/null
  echo "=========== RECENT CONVERSATION TURNS ==========="
  local -a TURNS
  mapfile -t TURNS < <(jq -rn "$JQDEFS"'
    inputs | . as $x
    | if $x.type=="user"
        then ($x|ht) as $t
          | if (($t|gsub("[ \n\r\t]";"")|length)>0 and (($t|synthetic)|not)) then "[YOU] " + (($t|clean)[0:280]) else empty end
      elif ($x.type=="assistant" and (($x.message.content|type)=="array"))
        then ([ $x.message.content[]? | if .type=="text" then .text elif .type=="tool_use" then "«tool:\(.name)»" else empty end ] | join(" "))
             | clean | if (gsub(" ";"")|length)>0 then "[CLAUDE] " + .[0:280] else empty end
      else empty end
  ' "$P" 2>/dev/null)
  printf '%s\n' "${TURNS[@]: -$TAIL}"
  echo; echo "(total turns: ${#TURNS[@]}; id: $(basename "$P" .jsonl))"
}

case "$CMD" in
  list)   cmd_list "${1:-}";;
  find)   if resolve "${1:?id required}"; then :; else rc=$?; [[ $rc -eq 1 ]] && echo NONE; [[ $rc -eq 2 ]] && echo AMBIGUOUS; fi;;
  digest) cmd_digest "${1:?id required}";;
  *) echo "usage: devam.sh {list [filter]|find <id>|digest <id>}"; exit 64;;
esac
