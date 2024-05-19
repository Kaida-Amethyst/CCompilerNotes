---
title: 76. Local Var in For-Loop
---

## commit log

```plaintext
Allow for-loops to define local variables
```

允许for循环定义局部变量。注意这里是说在循环体内定义变量，循环体内本身就是一个compound_stmt，是支持定义局部变量的。这里指的就是`for`循环中的`init`定义变量。

## Parser

修改parser即可，在识别出`for`关键字时，直接让其进入一个scope。

```c
static Node *stmt (Token **rest, Token *tok) {
  // code
  if (equal(tok, "for")) {
    Node *node = new_node(ND_FOR, tok);
    tok = skip(tok->next, "(");
    enter_scope();
    if (is_typename(tok)) {
      Type *basety = declspec(&tok, tok, NULL);
      node->init = declaration(&tok, tok, basety);
    } else {
      node->init = expr_stmt(&tok, tok);
    }
    if (!equal(tok, ";")) 
      node->cond = expr(&tok, tok);
    tok = skip(tok, ";");
    if (!equal(tok, ")"))
      node->inc = expr(&tok, tok);
    tok = skip(tok, ")");
    node->then = stmt(rest, tok);
    leave_scope();
    return node;
  }
}
```

## test

```c
// control.c
int main() {
  ASSERT(55, ({ int j=0; for (int i=0; i<=10; i=i+1) j=j+i; j; }));
  ASSERT(3, ({ int i=3; int j=0; for (int i=0; i<=10; i=i+1) j=j+i; i; }));
}
```
