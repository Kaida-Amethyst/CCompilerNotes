---
title: 72. Bool Type
---

## commit log

```plaintext
    Add _Bool type
  
    _Bool isn't just a 1-bit integer because when you convert a value
    to bool, the result is 1 if the original value is non-zero. This
    is contrary to the other small integral types, e.g. char, as you
    can see below:
  
      char x  = 256; // x is 0
      _Bool y = 256; // y is 1
```

添加bool类型。

原生C编译器需要使用`stdbool`这个头文件。

## type

添加对bool类型的支持。

```c
// chibicc.h
typedef enum {
  // other types
  TY_BOOL,
};

extern Type *ty_bool;

// type.c
Type *ty_bool = &(Type){TY_BOOL, 1, 1};

bool is_integer(Type *ty) {
  TypeKind k = ty->kind;
  return k == TY_BOOL || k == TY_CHAR || k == TY_SHORT ||
         k == TY_INT  || k == TY_LONG;
}

// Suggest:
bool is_integer(Type *ty) {
  switch(ty->kind) {
  case TY_BOOL:
  case TY_CHAR:
  case TY_SHORT:
  case TY_INT:
  case TY_LONG:
    return true;
  default: break;
  }
  return false;
}
```

## Lexer

添加对`_Bool`关键字的支持。

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
    "struct", "union", "short", "long", "void", "typedef", "_Bool"
  };
  // code
}
```

## Parser

修改`declspec`函数：

```c
static Type *declspec(Token **rest, Token *tok, VarAttr *attr) {
  enum {
    VOID = 1 << 0,
    BOOL = 1 << 2,
    CHAR = 1 << 4,
    INT  = 1 << 8,
    LONG = 1 << 10,
    OTHRE = 1 << 12,
  };
  Type *ty = ty_int;
  int counter = 0;

  while (is_typename(tok)) {
    // Handle "typedef" keyword
    if (equal(tok, "typedef")) {
      if (!attr)
        error_tok(tok, "storage class specifier is not allowed in this context");
      attr->is_typedef = true;
      tok = tok->next;
      continue;
    }  

    // Handle user-defined types.
    Type *ty2 = find_typedef(tok);
    if (equal(tok, "struct") || equal(tok, "union") || ty2) {
      if (counter)
        break;

      if (equal(tok, "struct")) {
        ty = struct_decl(&tok, tok->next);
      } else if (equal(tok, "union")) {
        ty = union_decl(&tok, tok->next);
      } else {
        ty = ty2; 
        tok = tok->next;
      }  

      counter += OTHER;
      continue;
    }
    // Handle built-in types.
    if (equal(tok, "void"))
      counter += VOID;
    else if (equal(tok, "_Bool"))  // <---
      counter += BOOL;
    else if (equal(tok, "char"))
      counter += CHAR;
    else if (equal(tok, "short"))
      counter += SHORT;
    else if (equal(tok, "int"))
      counter += INT;
    else if (equal(tok, "long"))
      counter += LONG;
    else
      unreachable();

    switch (counter) {
    case VOID:
      ty = ty_void;
      break;
    case BOOL:     // <---
      ty = ty_bool;
      break;
    case CHAR:
      ty = ty_char;
      break;
    case SHORT:
    case SHORT + INT:
      ty = ty_short;
      break;
    case INT:
      ty = ty_int;
      break;
    case LONG:
    case LONG + INT:
    case LONG + LONG:
    case LONG + LONG + INT:
      ty = ty_long;
      break;
    default:
      error_tok(tok, "invalid type");
    }

    tok = tok->next;
  }

  *rest = tok;
  return ty;
}

static bool is_typename(Token *tok) {
  static char *kw[] = {
    "void", "_Bool", "char", "short", "int", "long", "struct", "union",
     "typedef",
  };
  // code
}
```

## Codegen

最后就是codegen了，但是这里要额外注意的是，`bool`类型不能直接转，它要么是0，要么是1，因此需要一个`cmp`和`movzx`指令搭配。

```c
static void cmp_zero(Type *ty) {
  if (is_integer(ty) && ty->size <= 4) {
    println("  cmp $0, %%eax");
  } else {
    println("  cmp $0, %%rax");
  }
}

static void cast(Type * from, TYpe *ty) {
  if (to->kind = TY_BOOL) {
    cmp_zero(from);
    println("  setne %%al");
    println("  movzx %%al, %%eax");
    return ;
  }

  // other cases
}
```

## test

```c
// decl.c
  ASSERT(0, ({ _Bool x=0; x; }));
  ASSERT(1, ({ _Bool x=1; x; }));
  ASSERT(1, ({ _Bool x=2; x; }));
  ASSERT(1, (_Bool)1);
  ASSERT(1, (_Bool)2);
  ASSERT(0, (_Bool)(char)256);

// function.c
_Bool bool_fn_add(_Bool x) { return x + 1; }
_Bool bool_fn_sub(_Bool x) { return x - 1; }

int main() {
  ASSERT(1, bool_fn_add(3));
  ASSERT(0, bool_fn_sub(3));
  ASSERT(1, bool_fn_add(-3));
  ASSERT(0, bool_fn_sub(-3));
  ASSERT(1, bool_fn_add(0));
  ASSERT(1, bool_fn_sub(0));
}
```
