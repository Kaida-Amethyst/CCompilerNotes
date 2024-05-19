---
title: 17. While Loop
---

## Commit log

```plaintext
Add "while" Statement
```

## 范式

```plaintext
WHILEStmt : "while" "(" expr ")" stmt

stmt : "return" expr ";"
     | expr-stmt
     | "{" stmt "}"
     | IFStmt
     | FORStmt
     | WHILEStmt
     |
     ;
```

## 思路

其实`for`语句和`while`语句是类似的，所以某种程度上我们直接在数据结构上复用`for`就好。

## Lexer

拓展一下`is_keyword`函数即可。

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {"return", "if", "else", "for", "while"};
  // other code
}
```

## parser

在stmt函数中添加：

```c
if (equal(tok, "while")) {
  Node *node = new_node(ND_FOR);
  tok = skip(tok->next, "(");
  node->cond = expr(&tok, tok);
  tok = skip(tok, ")");
  node->then = stmt(rest, tok);
  return node;
}
```

## Codegen

我们这里复用了for，注意原先的for结构中init一定不为空，但是在这里init是有可能为空的所以对`gen_stmt`还是要稍作修改。

```c
case ND_FOR: {
  int c = count();
  if (node->init) 
    gen_stmt(node->init)
  // other code
}
```

## test.sh

添加一个新测例：

```bash
assert 10 '{ i=0; while(i<10) { i=i+1; } return i; }'
```

‍
