---
title: 31. Function Variable Merge
---

```plaintext
Merge Function with Var

No functional change
```

我们之后的commit会涉及到全局变量的问题。所以这里要做一个处理，因为我们这里是默认一个文件是连续的几个`function`构成的。

其实细细想来，一个`function`与一个`variable`其实是有很多相似之处的，本身就可以视作一类。

所以我们这一次commit来把function并入var之中。

## 头文件

我们先来看看原本代表变量的`Obj`结构体和代表函数的`function`结构体：

```c
// Local variable
typedef struct Obj Obj;
struct Obj {
  Obj *next;
  char *name; // Variable name
  Type *ty;   // Type
  int offset; // Offset from RBP
};

// Function
typedef struct Function Function;
struct Function {
  Function *next;
  char *name;
  Obj *params;

  Node *body;
  Obj *locals;
  int stack_size;
};
```

我们将其改写为下面的代码：

```c
// Variable or function
typedef struct Obj Obj;
struct Obj {
  Obj *next;
  char *name;    // Variable name
  Type *ty;      // Type
  bool is_local; // local or global/function

  // Local variable
  int offset;

  // Global variable or function
  bool is_function;

  // Function
  Obj *params;
  Node *body;
  Obj *locals;
  int stack_size;
};
```

当然，头文件里涉及到`function`的也都需要改掉：

```c
Obj *parse(Token *tok);
void codegen(Obj *prog);
```

## parser

我们把function修改的目的还是为了后面引入全局变量，这里我们在parser的部分引入新的全局变量，用于我们的语法分析。

```c
static Obj *locals;
static Obj *globals;
```

我们此时就需要有两种函数，一种是`new_lval`，这个已经实现，另一个是`new_gvar`，为了避免代码重复，我们再写一个`new_var`，让这两个函数去调用它。

```c
static Obj *new_var(char *name, Type *ty) {
  Obj *var = callow(1, sizeof(Obj));
  var->name = name;
  var->ty = ty;
  return var;
}

static Obj *new_lvar(char *name, Type *ty) {
  Obj *var = new_var(name, ty);
  var->is_local = true;
  var->next = locals;
  locals = var;
  return var;
}

static Obj *new_gvar(char *name, Type *ty) {
  Obj *var = new_var(name, ty);
  var->next = globals;
  globals = var;
  return var;
}
```

语法分析中的function要做重点修改：

我们先来看一下原实现：

```c
static Function *function(Token **rest, Token *tok) {
  Type *ty = declspec(&tok, tok);
  ty = declarator(&tok, tok, ty);

  locals = NULL;

  Function *fn = calloc(1, sizeof(Function));
  fn->name = get_ident(ty->name);
  create_param_lvars(ty->params);
  fn->params = locals;

  tok = skip(tok, "{");
  fn->body = compound_stmt(rest, tok);
  fn->locals = locals;
  return fn;
}
```

因为变量的类型和函数的返回类型都是直接置于最前的，因此我们把类型的判断放在函数解析的外面。不过我们暂时先不修改变量的类型判断的问题。

```c
static Token *function(Token *tok, Type *basety) {
  Type *ty = declarator(&tok, tok, basety);

  Obj *fn = new_gvar(get_ident(ty->name), ty);
  fn->is_function = true;

  locals = NULL;
  create_param_lvars(ty->params);
  fn->params = locals;

  tok = skip(tok, "{");
  fn->body = compound_stmt(&tok, tok);
  fn->locals = locals;
  return tok;
}
```

然后修改parse函数，注意我们这里暂时还不引入全局变量，因此我们还是按照无全局变量的逻辑来处理。

```c
Obj *parse(Token *tok) {
  globals = NULL;

  while (tok->kind != TK_EOF) {
    Type *basety = declspec(&tok, tok);
    tok = function(tok, basety);
  }
  return globals;
}
```

## codegen

相应的，我们也需要把codegen中有关function地方修改掉：

```c
static Obj *current_fn;

static void assign_lvar_offset(Obj *prog) {
  for (Obj *fn = prog; fn; fn = fn->next) {
    if (!fn->is_function)
      continue;
    /*  other code  */
  }
}
```

然后我们修改codegen函数，在以往，我们的汇编都是不考虑全局变量的，也就是没有`.text`段这种东西，从这个commit开始，我们添加一个`.text`段。

```c
void codegen(Obj *prog) {
  assign_lvar_offsets(prog);

  for(Obj *fn = prog; fn; fn = fn->next) {
    if (!fn->is_function)
      continue;

    printf("  .global %s\n", fn->name);
    printf("  .text\n");
    printf("%s:\n", fn->name);
    current_fn = fn;
    /*  other code  */
  }
}
```

然后就可以了，无须额外的测试用例。

‍
