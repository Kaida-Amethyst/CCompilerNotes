---
title: 26. Function Parameter Limits
---

## commit log

```plaintext
Support function definition up to 6 parameters
```

支持有参函数定义，但参数至多只能有6个。

## 思路

要扩展类型系统，`int add(int, int)`，和`int sub(int, int)`应该被视为同一种数据类型，但是与`int fma(int, int, int)`是不一样的数据类型。

## 头文件

对于`Function`结构体，添加`params`字段。

```c
struct Function {
  Function *next;
  char *name;
  Obj *params;

  Node *body;
  Obj *locals;
  int stack_size;
}
```

然后对于`Type`结构体，添加`params`字段（当Type是一个Function）的时候，以及`next`字段，用于多个参数的情况。

```c
struct Type {
  /*  other fiels  */
  Type *params;  // <---
  Type *next;    // <---
}
```

然后添加一个Type的复制构造函数的声明，一会儿要用：

```c
Type *copy_type(Type *ty);
```

## Type

先来修改一下Type，主要是添加一个`copy_type`函数。

```c
Type *copy_type(Type *ty) {
  Type *ret = calloc(1, sizeof(Type));
  *ret = *ty;
  return ret;
}
```

## Parser

语法分析上主要是修改`type_suffix`函数，这个函数在上一次commit，我们仅仅是处理函数定义后面的一对括号，现在我们让其拥有处理括号内参数的能力：

```c
static Type *type_suffix(Token **rest, Token *tok, Type *ty) {
  if (equal(tok, "(")) {
    tok = tok->next;

    Type head = {}; 
    Type *cur = &head;

    while (!equal(tok, ")")) {
      if (cur != &head)
        tok = skip(tok, ",");
      Type *basety = declspec(&tok, tok);
      Type *ty = declarator(&tok, tok, basety);
      cur = cur->next = copy_type(ty);
    }
    ty = func_type(ty);
    ty->params = head.next;
    *rest = tok->next;
    return ty; 
  }

  *rest = tok;
  return ty; 
}
```

然后，我们在初始化一个function的时候，需要把所涉及到的变量给分配内存，修改`function`函数：

```c
static Function *function(Token **rest, Token *tok) {
  Type *ty = declspec(&tok, tok);
  ty = declarator(&tok, tok, ty);

  locals = NULL;

  Function *fn = calloc(1, sizeof(Function));
  fn->name = get_ident(ty->name);
  create_param_lvars(ty->params);   // <-----
  fn->params = locals;              // <-----

  tok = skip(tok, "{");
  fn->body = compound_stmt(rest, tok);
  fn->locals = locals;
  return fn; 
}
```

这里面调用了`create_param_lvars`，主要就是循环`params`里面的变量，就是记录一个函数里面用到的局部变量。

```c
// 注意这里是倒着调用new_lvar的，这与locals的逆向生长有关。
static void create_param_lvars(Type *param) {
  if (param) {
    create_param_lvars(param->next);
    new_lvar(get_ident(param->name), param);
  }
}
```

## codegen

对于代码生成，只需要修改一处，就是我们需要给函数中的变量分配空间：

```c
void codegen(Function *prog) {
  assign_lvar_offsets(prog);

  for (Function *fn = prog; fn; fn = fn->next) {
    printf("  .globl %s\n", fn->name);
    printf("%s:\n", fn->name);
    current_fn = fn;

    // Prologue
    printf("  push %%rbp\n");
    printf("  mov %%rsp, %%rbp\n");
    printf("  sub $%d, %%rsp\n", fn->stack_size);

    // Save passed-by-register arguments to the stack
    int i = 0;   // <-------
    for (Obj *var = fn->params; var; var = var->next)           // <-------
      printf("  mov %s, %d(%%rbp)\n", argreg[i++], var->offset);// <-------

    // Emit code
    gen_stmt(fn->body);
    assert(depth == 0);

    // Epilogue
    printf(".L.return.%s:\n", fn->name);
    printf("  mov %%rbp, %%rsp\n");
    printf("  pop %%rbp\n");
    printf("  ret\n");
  }
}
```

## test.sh

然后，我们来添加测例：

```bash
assert 7 'int main() { return add2(3,4); } int add2(int x, int y) { return x+y; }'
assert 1 'int main() { return sub2(4,3); } int sub2(int x, int y) { return x-y; }'
assert 55 'int main() { return fib(9); } int fib(int x) { if (x<=1) return 1; return fib(x-1) + fib(x-2); }'
```

‍
