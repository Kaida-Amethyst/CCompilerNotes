---
title: 60. Function Declarations
---

## commit log

```plaintext
Add function declaration
```

添加函数声明。

# 头文件

```c
struct Obj {
  // other fields
  bool is_definition;
};
```

## Parser

对于函数声明的添加很简单，向后扫描看有没有`;`即可。如果有`;`，直接返回tok即可。

```c
static Token *function(Token *tok, Type *basety) {
  Type *ty = declarator(&tok, tok, basety);
  Obj* fn = new_gvar(get_ident(ty->name), ty);
  fn->is_function = true;
  fn->is_definition = !consume(&tok, tok, ";");   // <----

  if (!fn->is_definition)   // <---
    return tok;             // <---
  locals = NULL;
  enter_scope();
  create_param_lvars(ty->params);
  fn->body = compound_stmt(&tok, tok);
  fn->locals = locals;
  leave_scope();
  return tok;
}
```

## test.sh

```c
// test.h
int printf();
```

‍
